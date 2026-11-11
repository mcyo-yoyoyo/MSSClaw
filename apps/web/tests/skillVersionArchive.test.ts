import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveSkillVersion } from '../src/domain/skillVersionArchive.ts';
import type { PrototypeSkillSeed } from '../src/domain/prototype/types.ts';
const old = { version:'1.0', packageBlob:{id:'old',url:'/old',name:'old.zip'}, versions:[] } as unknown as PrototypeSkillSeed;
const next = { ...old, version:'2.0', packageBlob:{...old.packageBlob!,id:'new',url:'/new'} };
test('new package preserves original version package and appends current version',()=>{
 const rows=archiveSkillVersion(old,next)!;
 assert.equal(rows[0].version,'2.0'); assert.equal(rows[0].packageBlob?.id,'new');
 assert.equal(rows[1].version,'1.0'); assert.equal(rows[1].packageBlob?.id,'old');
 assert.equal(old.versions?.length,0);
 const third=archiveSkillVersion({...next,versions:rows},{...next,version:'3.0',packageBlob:{...next.packageBlob,id:'third'}})!;
 assert.deepEqual(third.map(r=>r.packageBlob?.id),['third','new','old']);
});
test('duplicate versions are rejected, metadata-only changes preserve archives',()=>{
 assert.throws(()=>archiveSkillVersion(old,{...next,version:'V1.0'}),/新的版本号/);
 const rows=archiveSkillVersion(old,next)!;
 assert.throws(()=>archiveSkillVersion({...next,versions:rows},{...next,version:'v1.0'}),/已存在/);
 assert.equal(archiveSkillVersion({...next,versions:rows},{...next,desc:'edited'}),rows);
});
