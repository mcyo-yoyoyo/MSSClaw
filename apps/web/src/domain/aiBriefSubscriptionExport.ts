import type { AiBriefEmailSubscriptionRecord } from '@/api/aiBriefSubscriptionsApi';

function spreadsheetSafe(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

/** 将后台当前订阅名单导出为真正的 .xlsx 文件。 */
export async function downloadAiBriefSubscriptionsExcel(
  items: AiBriefEmailSubscriptionRecord[],
): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = items.map((item, index) => ({
    序号: index + 1,
    姓名: spreadsheetSafe(item.userName),
    邮箱: spreadsheetSafe(item.email),
    用户ID: spreadsheetSafe(item.userId),
    订阅时间: formatDateTime(item.subscribedAt),
    更新时间: formatDateTime(item.updatedAt),
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 34 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'AI快讯订阅名单');
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
  XLSX.writeFile(workbook, `mss-ai-brief-subscribers-${stamp}.xlsx`);
}
