import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { Readable } from 'node:stream';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';
const require = createRequire(import.meta.url);
const { zipSync } = require('fflate');
const { PrismaService } = require('../dist/prisma/prisma.service.js');
const { SkillRunService } = require('../dist/skill-worker/skill-run.service.js');
const { SkillWorker } = require('../dist/skill-worker/skill-worker.js');
const { ManifestSchema, validatePackage, unpackZip } = require('../dist/skill-worker/package.js');
const { dockerArgs, LocalSandboxDriver, DockerSandboxDriver, createSandboxDriver } = require('../dist/skill-worker/sandbox-driver.js');
const { SkillRunsController } = require('../dist/executions/skill-runs.controller.js');
const { executionRoute } = require('../dist/executions/executor-registry.js');
const manifest = { entry: 'scripts/main.py', runtime: 'python3', inputs: { extensions: ['.xlsx'], maxCount: 1 }, outputs: [{ pattern: 'summary.md', mime: 'text/markdown' }], platforms: ['linux'] };
const zip = (files) => Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([k,v]) => [k, Buffer.from(v)]))));
test('manifest rejects traversal, missing entry and runtime; ZIP rejects zip slip and symlinks', () => {
  for (const entry of ['../x', '/tmp/x', 'a/../b', 'C:/x', 'a\\x']) assert.equal(ManifestSchema.safeParse({ ...manifest, entry }).success, false);
  assert.equal(ManifestSchema.safeParse({ ...manifest, entry: undefined }).success, false);
  assert.equal(ManifestSchema.safeParse({ ...manifest, runtime: 'bash' }).success, false);
  assert.throws(() => validatePackage(zip({ 'skill.json': JSON.stringify(manifest) })), /entry_not_found/);
  assert.throws(() => unpackZip(zip({ '../escape': 'x' })), /unsafe_zip_entry/);
  const archive = zip({ link: 'target' });
  const pos = archive.indexOf(Buffer.from('504b0102','hex'));
  archive.writeUInt32LE(0xa1ff0000, pos + 38);
  assert.throws(() => unpackZip(archive), /unsafe_zip_entry/);
});
test('docker isolation parameters and env allowlist; production local forbidden', () => {
  const args = dockerArgs({ image: 'image:1', workdirMounts: { skill: '/a', input: '/b', output: '/c' }, command: ['python3','/skill/main.py'], env: { DATABASE_URL: 'secret', LLM_API_KEY: 'secret', S3_SECRET_KEY: 'secret', MSSCLAW_INPUT_DIR: '/input' }, memoryMb: 512, cpus: 1 }, 'name');
  for (const value of ['--rm','--pull=never','--network','none','--read-only','--tmpfs','--user','10001:10001','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','--memory','--cpus']) assert.ok(args.includes(value), value);
  assert.ok(args.includes('type=bind,src=/a,dst=/skill,readonly'));
  assert.ok(args.includes('type=bind,src=/b,dst=/input,readonly'));
  assert.ok(!args.join(' ').includes('secret'));
  const old = { ...process.env }; process.env.NODE_ENV = 'production'; process.env.SKILL_SANDBOX_DRIVER = 'local';
  try { assert.throws(createSandboxDriver); } finally { process.env = old; }
});
test('registry defaults to prompt; script fallback and agent not supported', () => {
  assert.equal(executionRoute().mode,'prompt');
  const old = process.env.SKILL_SCRIPT_EXECUTION_ENABLED; delete process.env.SKILL_SCRIPT_EXECUTION_ENABLED;
  assert.deepEqual(executionRoute('script'),{ mode:'prompt', fallback:true });
  assert.throws(() => executionRoute('agent'), /not_supported/);
  if (old !== undefined) process.env.SKILL_SCRIPT_EXECUTION_ENABLED = old;
});
test('PG queue concurrency, user limit, access, recovery and local example end to end', async (t) => {
  let db;
  try { db = await createTestDatabase('skill_sandbox'); }
  catch (error) { if (process.env.TEST_DATABASE_URL || process.env.DATABASE_URL) throw error; t.skip(error.message); return; }
  const old = { ...process.env }; process.env.DATABASE_URL = db.url;
  process.env.SKILL_RUN_PER_USER_LIMIT = '1'; process.env.SKILL_WORKER_CONCURRENCY = '2';
  const prisma = new PrismaService(), runs = new SkillRunService(prisma);
  const cleanupBlobs = []; let realBlobs;
  try {
    const submissions = await Promise.allSettled([runs.enqueue('alice','skill','1',{ id:'pkg' },[]), runs.enqueue('alice','skill','1',{ id:'pkg' },[])]);
    assert.equal(submissions.filter((r) => r.status === 'fulfilled').length,1);
    const a = submissions.find((r) => r.status === 'fulfilled').value;
    await assert.rejects(runs.enqueue('alice','skill','1',{ id:'pkg' },[]), /skill_run_per_user_limit/);
    const claims = await Promise.all([runs.claim('worker1'), runs.claim('worker2')]);
    assert.equal(claims.filter(Boolean).length,1);
    const claimed = claims.find(Boolean);
    await assert.rejects(runs.owned(a.id,'bob'), /skill_run_not_found/);
    await assert.rejects(runs.events(a.id,'bob'), /skill_run_not_found/);
    await assert.rejects(runs.cancel(a.id,'bob'), /skill_run_not_found/);
    const controller = new SkillRunsController(runs,{ me: async () => ({ ok:true,user:{ id:'bob' } }) },{},{});
    await assert.rejects(controller.download(a.id,'artifact',{},'Bearer test'), /skill_run_not_found/);
    await prisma.skillRun.update({ where:{ id:a.id }, data:{ lockedUntil:new Date(0) } });
    await runs.recoverExpired();
    assert.equal((await runs.owned(a.id,'alice')).error,'worker_interrupted');
    const python = spawnSync('python3',['-c','import pandas,openpyxl']);
    if (python.status !== 0) { t.diagnostic('local example skipped: pandas/openpyxl unavailable'); return; }
    const example = new URL('../../../deploy/sandbox/examples/excel-summary/', import.meta.url).pathname;
    const packageData = zip({ 'skill.json':await readFile(join(example,'skill.json')), 'scripts/main.py':await readFile(join(example,'scripts/main.py')) });
    const xlsx = require('xlsx');
    const book = xlsx.utils.book_new(); xlsx.utils.book_append_sheet(book,xlsx.utils.json_to_sheet([{ amount:10 },{ amount:20 }]),'data');
    const inputs = new Map([['pkg',{ bytes:packageData, name:'skill.zip' }],['input',{ bytes:xlsx.write(book,{ type:'buffer',bookType:'xlsx' }), name:'data.xlsx' }]]);
    const saved = new Map();
    let blobs = { get:async (id) => { const b = inputs.get(id) || saved.get(id); return { meta:{ name:b.name }, stream:Readable.from([b.bytes]) }; }, putBase64:async (b) => { const id = `artifact${saved.size}`; saved.set(id,{ ...b,bytes:Buffer.from(b.dataBase64,'base64') }); return { id,name:b.name,mimeType:b.mimeType,size:saved.get(id).bytes.length }; } };
    if (process.env.SKILL_TEST_S3 === 'true') {
      const { BlobStoreService } = require('../dist/persistence/blob-store.service.js');
      realBlobs = new BlobStoreService(); await realBlobs.onModuleInit();
      const aliases = new Map();
      for (const [id, file] of inputs) {
        const blob = await realBlobs.putBase64({ name:file.name, dataBase64:file.bytes.toString('base64'), privateOwner:'alice' });
        aliases.set(id,blob.id); cleanupBlobs.push(blob);
      }
      blobs = {
        get: (id) => realBlobs.get(aliases.get(id) || id),
        putBase64: async (input) => {
          const blob = await realBlobs.putBase64(input); cleanupBlobs.push(blob);
          saved.set(blob.id,{ ...input,bytes:Buffer.from(input.dataBase64,'base64') }); return blob;
        },
      };
      t.diagnostic('Real S3/MinIO artifact upload and authenticated download enabled');
    }
    await prisma.skillRunInput.create({ data:{ blobId:'input', memberId:'alice' } });
    await runs.enqueue('alice','skill','1',{ id:'pkg' },['input']);
    process.env.SKILL_SANDBOX_DRIVER = 'local';
    const next = await runs.claim('local');
    await new SkillWorker(runs,blobs,new LocalSandboxDriver(),'local').execute(next);
    const final = await runs.owned(next.id,'alice');
    assert.equal(final.status,'succeeded',final.error);
    assert.equal(final.artifacts.length,2);
    assert.ok([...saved.values()].every((b) => b.privateOwner === 'alice'));
    assert.match([...saved.values()].find((b) => b.name.endsWith('.md')).bytes.toString(),/2 行/);
    let downloaded = false;
    const { Writable } = await import('node:stream');
    const response = new Writable({ write(chunk,encoding,callback) { downloaded = true; callback(); } }); response.setHeader = () => {};
    const owner = new SkillRunsController(runs,{ me:async () => ({ ok:true,user:{ id:'alice' } }) },blobs,{});
    await owner.download(next.id,final.artifacts[0].id,response,'Bearer test');
    await new Promise((resolve) => response.on('finish',resolve)); assert.ok(downloaded);
    await assert.rejects(owner.download(next.id,'unknown',response,'Bearer test'),/artifact_not_found/);
  } finally { for (const b of cleanupBlobs) await realBlobs.delete(b.id,b.deleteToken); await prisma.$disconnect(); await db.drop(); process.env = old; }
});
test('Docker integration: host isolation, network denied and timeout', async (t) => {
  const cli = process.env.SKILL_SANDBOX_CLI || 'docker', image = process.env.SKILL_TEST_IMAGE || 'mssclaw-python:1';
  if (spawnSync(cli,['image','inspect',image],{ stdio:'ignore',timeout:10000 }).status !== 0) { t.skip('sandbox image unavailable; build deploy/sandbox/Dockerfile.python'); return; }
  const root = await mkdtemp(join(tmpdir(),'sandbox-test-'));
  try {
    for (const part of ['skill','input','output']) await mkdir(join(root,part),{ mode:0o777 });
    await writeFile(join(root,'host-secret'),'secret');
    const options = { image,runId:'test',workdirMounts:{ skill:join(root,'skill'), input:join(root,'input'), output:join(root,'output') },command:['python3','-c',`import os,socket; assert not os.path.exists('${join(root,'host-secret')}'); s=socket.socket(); s.settimeout(1); assert s.connect_ex(('1.1.1.1',443)) != 0`],env:{},timeoutSec:10,memoryMb:128,cpus:1,networkPolicy:'none',signal:new AbortController().signal };
    const driver = new DockerSandboxDriver();
    const result = await driver.run(options); assert.equal(result.exitCode,0,result.stderr);
    const timed = await driver.run({ ...options,command:['python3','-c','import time; time.sleep(30)'],timeoutSec:1 }); assert.equal(timed.timedOut,true);
  } finally { await rm(root,{ recursive:true,force:true }); }
});
