import { useRef, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { BATCH_MAX_BYTES, parseSkillBatch, zipFiles, type BatchSkillRow } from '@/domain/skillBatchArchive';
import { uploadWorkspaceOpsPackage } from '@/api/blobApi';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { getVisibleHomeDepts, getVisibleHomeRegions } from '@/domain/rolePerspective';
import { getCurrentPlatformRole, getCurrentOrgAffiliation, isSystemAdmin, getCurrentUserName } from '@/domain/currentUser';

export function SkillBatchTransfer() {
  const picker = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BatchSkillRow[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<Record<number, string>>({});
  const skills = useMarketplaceStore(s => s.skills);
  const buttonClass = 'rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium disabled:opacity-40';

  async function preview(file: File) {
    setOpen(true); setBusy(true); setRows([]); setResults({}); setError(''); setOverwrite(false);
    setProgress('正在检查 ZIP 和 Excel…');
    try {
      if (file.size > BATCH_MAX_BYTES) throw new Error('批量包不能超过 200 MiB');
      setRows(await parseSkillBatch(new Uint8Array(await file.arrayBuffer())));
    } catch (e) { setError(e instanceof Error ? e.message : '解析失败'); }
    finally { setBusy(false); setProgress(''); }
  }

  async function importRows() {
    setBusy(true); setError('');
    for (const row of rows) {
      if (!row.skill || !row.files || row.error || results[row.row] === '成功') continue;
      const existing = useMarketplaceStore.getState().skills.find(s => s.id === row.id);
      if (existing && !overwrite) {
        setResults(prev => ({ ...prev, [row.row]: '已跳过' })); continue;
      }
      setProgress(`正在导入第 ${row.row - 1}/${rows.length} 项：${row.name}`);
      try {
        const role = getCurrentPlatformRole();
        const org = getCurrentOrgAffiliation();
        if (!isSystemAdmin(role)) {
          const depts = getVisibleHomeDepts(org, role);
          const regions = getVisibleHomeRegions(org, role);
          if (row.skill.ownerDeptIds?.some(id => !depts.includes(id))) throw new Error('仅可导入本人组织应用领域的 Skill');
          if (row.skill.ownerRegionId && !regions.includes(row.skill.ownerRegionId)) throw new Error('仅可导入本人组织应用区域的 Skill');
        }
        const bytes = await zipFiles(row.files);
        const uploaded = await uploadWorkspaceOpsPackage(new File([new Uint8Array(bytes)], `${row.id}.zip`, { type: 'application/zip' }));
        const stamp = new Date().toISOString();
        const skill: PrototypeSkillSeed = {
          ...existing, ...row.skill, packageBlob: { ...uploaded, uploadedAt: stamp },
          published: existing?.published ?? false, callable: existing?.callable ?? false,
          invokes: existing?.invokes ?? 0, createdAt: existing?.createdAt || stamp,
          updatedAt: stamp, updatedBy: getCurrentUserName(),
        };
        const saved = await useMarketplaceStore.getState().saveSkillNow(skill, !existing, existing?.updatedAt);
        // Keep uploaded blobs on uncertain HTTP failures: the server may have committed the write.
        if (!saved.synced) throw new Error(saved.detail || '未连接后端，未保存');
        setResults(prev => ({ ...prev, [row.row]: '成功' }));
      } catch (e) {
        setResults(prev => ({ ...prev, [row.row]: `失败：${e instanceof Error ? e.message : '导入失败'}` }));
      }
    }
    setBusy(false); setProgress('');
  }
  const succeeded = Object.values(results).filter(v => v === '成功').length;
  const skipped = Object.values(results).filter(v => v === '已跳过').length;
  const failed = Object.values(results).filter(v => v.startsWith('失败')).length;
  return <>
    <input ref={picker} hidden type="file" accept=".zip" onChange={e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (file) void preview(file);
    }} />
    <button type="button" className={buttonClass} disabled={busy} onClick={() => picker.current?.click()}>批量导入</button>
    {!open && (progress || error) ? <span role="status" className="text-xs text-zinc-600">{error || progress}</span> : null}
    <CenterModal open={open} title="批量导入 Skill" size="xl" onClose={() => { if (!busy) { setOpen(false); setRows([]); setError(''); } }} actions={<>
      <button className={buttonClass} disabled={busy} onClick={() => { setOpen(false); setRows([]); setError(''); }}>关闭</button>
      <button className={buttonClass} disabled={busy || !rows.some(r => r.skill && results[r.row] !== '成功')} onClick={() => void importRows()}>确认导入 / 重试未成功项</button>
    </>}>
      <p className="text-sm text-zinc-600">ZIP 包含 skills/ 和 skills.xlsx。每批最多 100 个、200 MiB，解压后最多 512 MiB。新条目保存为草稿，更新保留发布状态。处理期间请勿关闭或刷新页面。</p>
      <label className="my-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={overwrite} disabled={busy} onChange={e => setOverwrite(e.target.checked)} />覆盖已有相同 Skill ID（默认跳过）</label>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <p role="status" className="my-2 text-sm">{progress || `共 ${rows.length} 项，校验失败 ${rows.filter(r => r.error).length} 项；成功 ${succeeded}，跳过 ${skipped}，导入失败 ${failed}`}</p>
      <div className="max-h-96 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Excel 行</th><th>Skill / ID</th><th>版本 / 应用领域 / 应用区域</th><th>处理方式与结果</th></tr></thead><tbody>{rows.map(row => <tr key={row.row} className="border-t border-zinc-100"><td className="p-2">{row.row}</td><td className="p-2">{row.name}<br /><span className="text-zinc-400">{row.id}</span></td><td className="p-2">{row.skill ? `${row.skill.version} / ${row.skill.ownerDeptIds?.[0] || "未设置"} / ${row.skill.ownerRegionId || "不限"}` : "—"}</td><td className="p-2">{row.error || results[row.row] || (skills.some(s => s.id === row.id) ? (overwrite ? '覆盖更新' : '同 ID，将跳过') : '新增草稿')}</td></tr>)}</tbody></table></div>
    </CenterModal>
  </>;
}
