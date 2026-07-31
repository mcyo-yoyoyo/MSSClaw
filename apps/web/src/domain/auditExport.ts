import * as XLSX from 'xlsx';
import {
  AUDIT_CATEGORY_LABELS,
  type AuditLogEntry,
  type AuditLogQuery,
} from '@/domain/auditLog';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { ROLE_LABELS } from '@/domain/rbac';

function formatAt(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return iso;
  }
}

function toRow(entry: AuditLogEntry) {
  return {
    时间: formatAt(entry.at),
    类别: AUDIT_CATEGORY_LABELS[entry.category] ?? entry.category,
    操作: entry.action,
    模块: entry.module,
    详情: entry.detail,
    账号姓名: entry.userName,
    账号邮箱: entry.userEmail ?? '',
    角色: entry.role ? ROLE_LABELS[entry.role] : '',
    领域部门: (entry.deptIds ?? []).map(getDeptLabel).join('、') || '未指定',
    区域: entry.regionId ? getRegionLabel(entry.regionId) : '机关/未挂区域',
    工作区: entry.workspaceId ?? '',
    日志ID: entry.id,
  };
}

function querySummary(query?: AuditLogQuery) {
  return [
    { 指标: '导出时间', 值: new Date().toISOString() },
    { 指标: '类别筛选', 值: !query?.category || query.category === 'all' ? '全部' : (AUDIT_CATEGORY_LABELS[query.category] ?? query.category) },
    {
      指标: '领域筛选',
      值: query?.deptId ? getDeptLabel(query.deptId) : '全部',
    },
    {
      指标: '区域筛选',
      值:
        query?.regionId === '__hq__'
          ? '机关/未挂区域'
          : query?.regionId
            ? getRegionLabel(query.regionId)
            : '全部',
    },
    { 指标: '账号搜索', 值: query?.accountQuery?.trim() || '无' },
  ];
}

/**
 * 批量导出审计日志为 Excel（当前筛选结果或勾选子集）。
 */
export function downloadAuditLogsExcel(
  logs: AuditLogEntry[],
  options?: { query?: AuditLogQuery; workspaceName?: string },
) {
  const rows = logs.map(toRow);
  const detailSheet =
    rows.length > 0 ? rows : [{ 说明: '当前无符合条件的审计日志' }];

  const summarySheet = [
    ...querySummary(options?.query),
    { 指标: '组织/工作区', 值: options?.workspaceName ?? '' },
    { 指标: '导出条数', 值: logs.length },
  ];

  const byCategory = logs.reduce(
    (acc, l) => {
      const key = AUDIT_CATEGORY_LABELS[l.category] ?? l.category;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const categorySheet = Object.keys(byCategory).length
    ? Object.entries(byCategory).map(([类别, 条数]) => ({ 类别, 条数 }))
    : [{ 类别: '无', 条数: 0 }];

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summarySheet);
  const wsDetail = XLSX.utils.json_to_sheet(detailSheet);
  const wsCat = XLSX.utils.json_to_sheet(categorySheet);
  const detailKeys = Object.keys(detailSheet[0] ?? {});
  wsDetail['!cols'] = detailKeys.map((k) => ({
    wch: Math.min(36, Math.max(10, String(k).length + 6)),
  }));

  XLSX.utils.book_append_sheet(wb, wsSummary, '导出说明');
  XLSX.utils.book_append_sheet(wb, wsDetail, '审计明细');
  XLSX.utils.book_append_sheet(wb, wsCat, '类别汇总');

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `mssclaw-audit-${stamp}.xlsx`);
}
