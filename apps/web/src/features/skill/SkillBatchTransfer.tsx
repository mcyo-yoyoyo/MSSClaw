/**
 * [INPUT]: 读取 Excel 明细、当前 Skill 目录和逐条保存接口。
 * [OUTPUT]: 导出 SkillBatchTransfer，预览新增和字段差异并保存。
 * [POS]: 后台 Skill 管理页的明细表导入入口。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import { useRef, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import { CatalogConflictError, createSkillFromSheetApi, fetchSkillCatalogApi, saveSkillSheetUpdate } from '@/api/persistenceApi';
import { parseSkillSheet, planSkillSheetRow, skillSheetUpdatePatch, type SkillSheetRow } from '@/domain/skillSheetImport';
import { skillSheetMetadata } from '@/domain/skillSheetColumns';
import { PACKAGE_UPLOAD_MAX_BYTES, PACKAGE_UPLOAD_MAX_LABEL } from '@/domain/packageUpload';
import { getVisibleHomeDepts, getVisibleHomeRegions } from '@/domain/rolePerspective';
import { getCurrentPlatformRole, getCurrentOrgAffiliation, isSystemAdmin } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

type Preview = { row: SkillSheetRow; plan: ReturnType<typeof planSkillSheetRow> };
const actionLabel = { create: '新增草稿', update: '更新', unchanged: '无变化', invalid: '无法导入' } as const;
const buttonClass = 'rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium disabled:opacity-40';

export function SkillBatchTransfer() {
  const picker = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<Preview[]>([]);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<Record<number, { ok: boolean; label: string }>>({});
  const busy = Boolean(progress);
  const pending = previewRows.filter(({ row, plan }) =>
    (plan.action === 'create' || plan.action === 'update') && !results[row.row]?.ok);

  async function preview(file: File) {
    setOpen(true);
    setPreviewRows([]);
    setResults({});
    setError('');
    setProgress('正在比对 Excel 与现有 Skill…');
    try {
      if (file.size > PACKAGE_UPLOAD_MAX_BYTES) throw new Error(`Excel 文件超过 ${PACKAGE_UPLOAD_MAX_LABEL}`);
      const rows = await parseSkillSheet(new Uint8Array(await file.arrayBuffer()));
      const skills = await fetchSkillCatalogApi();
      setPreviewRows(rows.map(row => ({ row, plan: planSkillSheetRow(row, skills) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取 Excel 失败');
    } finally {
      setProgress('');
    }
  }

  async function importRows() {
    for (const { row, plan } of pending) {
      if (!plan.skill) continue;
      setProgress(`正在保存第 ${row.row} 行：${row.name}`);
      try {
        const skill = plan.skill;
        const role = getCurrentPlatformRole();
        if (!isSystemAdmin(role)) {
          const org = getCurrentOrgAffiliation();
          const depts = getVisibleHomeDepts(org, role);
          const regions = getVisibleHomeRegions(org, role);
          for (const item of [plan.existing, skill]) {
            if (!item) continue;
            if (item.ownerDeptIds?.some(id => !depts.includes(id))) throw new Error('应用领域超出当前组织范围');
            if (item.ownerRegionIds?.some(id => !regions.includes(id)) || (item.ownerRegionId && !regions.includes(item.ownerRegionId))) {
              throw new Error('应用区域超出当前组织范围');
            }
          }
        }
        const item = plan.action === 'create'
          ? await createSkillFromSheetApi(skill)
          : await saveSkillSheetUpdate(skill.id, skillSheetUpdatePatch(plan), plan.existing?.updatedAt);
        useMarketplaceStore.setState(state => ({
          skills: state.skills.some(entry => entry.id === item.id)
            ? state.skills.map(entry => entry.id === item.id ? item : entry)
            : [item, ...state.skills],
        }));
        setResults(prev => ({ ...prev, [row.row]: { ok: true, label: plan.action === 'create' ? '已新增' : '已更新' } }));
      } catch (e) {
        const label = e instanceof CatalogConflictError ? '目录已变化，请重新选择 Excel 比对'
          : e instanceof Error ? e.message : '保存失败';
        setResults(prev => ({ ...prev, [row.row]: { ok: false, label: `失败：${label}` } }));
      }
    }
    setProgress('');
  }

  return <>
    <input ref={picker} hidden type="file" accept=".xls,.xlsx" onChange={e => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) void preview(file);
    }} />
    <button type="button" className={buttonClass} disabled={busy} onClick={() => picker.current?.click()}>批量导入</button>
    <CenterModal open={open} title="批量导入 Skill" size="xl" onClose={() => { if (!busy) setOpen(false); }} actions={<>
      <button className={buttonClass} disabled={busy} onClick={() => setOpen(false)}>关闭</button>
      <button className={buttonClass} disabled={busy || !pending.length} onClick={() => void importRows()}>
        {Object.values(results).some(r => !r.ok) ? '重试失败项' : '确认导入'}
      </button>
    </>}>
      <div className="p-5">
        <p className="text-sm text-zinc-600">按 Skill 名称比对。新名称保存为草稿，同名只更新有差异的字段，空白单元格保留原值。文件包请在单个 Skill 中维护。</p>
        {error && <p role="alert" className="my-2 text-sm text-red-600">{error}</p>}
        <p role="status" className="my-2 text-sm">{progress || (previewRows.length
          ? `共 ${previewRows.length} 行，待保存 ${pending.length} 行，已保存 ${Object.values(results).filter(r => r.ok).length} 行` : '')}</p>
        {previewRows.length > 0 && <div className="max-h-96 overflow-auto"><table className="w-full text-left text-xs">
          <thead><tr><th className="p-2">Excel 行</th><th>Skill 名称</th><th>处理结果</th><th>变更字段或原因</th></tr></thead>
          <tbody>{previewRows.map(({ row, plan }) => (
            <tr key={row.row} className="border-t border-zinc-100 align-top">
              <td className="p-2">{row.row}</td><td className="p-2">{row.name}</td>
              <td className="p-2">{results[row.row]?.label || actionLabel[plan.action]}</td>
              <td className="p-2">
                {plan.action === 'update' && plan.skill && plan.existing ? (
                  <FieldChanges before={skillSheetMetadata(plan.existing)} after={skillSheetMetadata(plan.skill)} fields={plan.changes} />
                ) : plan.error || plan.changes.join('、')}
              </td>
            </tr>
          ))}</tbody>
        </table></div>}
      </div>
    </CenterModal>
  </>;
}

function FieldChanges({ before, after, fields }: {
  before: Record<string, string>; after: Record<string, string>; fields: string[];
}) {
  return <details>
    <summary className="cursor-pointer">{fields.join('、')}</summary>
    <dl className="mt-2 space-y-1">
      {fields.map(field => <div key={field}>
        <dt className="font-medium">{field}</dt>
        <dd className="whitespace-pre-wrap break-words">{before[field] || '（空）'} → {after[field] || '（空）'}</dd>
      </div>)}
    </dl>
  </details>;
}
