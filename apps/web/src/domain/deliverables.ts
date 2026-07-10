import { downloadBlob } from '@/lib/download';

export interface DeliverableItem {
  id: string;
  icon: string;
  iconClass: string;
  name: string;
  size: string;
  onDownload: () => void;
}

function marketingReportCsv(query: string) {
  return [
    '代表处,SO排名,环比,归因因子',
    '墨西哥,1,+12.4%,渠道促销',
    '巴西,2,-3.1%,竞品降价',
    '阿根廷,3,+5.8%,新品上市',
    '',
    `# 生成任务: ${query || '营销数据分析'}`,
    `# 导出时间: ${new Date().toISOString()}`,
  ].join('\n');
}

function marketingSummaryText(query: string) {
  return [
    'MSS Claw · 策略摘要',
    '==================',
    '',
    `任务: ${query || '营销数据分析'}`,
    `生成时间: ${new Date().toLocaleString('zh-CN')}`,
    '',
    '结论摘要:',
    '- 拉美穿戴 SO 环比 +8.2%，墨西哥、阿根廷贡献主要增量',
    '- 竞品 A 降价对巴西市场影响显著，建议启动 NBA 补贴券策略',
    '- IoT 剔除后排名稳定，渠道促销为首要归因因子',
  ].join('\n');
}

function knowledgeSummaryDoc(query: string) {
  return [
    'MSS Claw · 知识检索摘要',
    '',
    `查询: ${query || '知识检索'}`,
    `导出: ${new Date().toLocaleString('zh-CN')}`,
    '',
    '核心结论:',
    '1. 可穿戴营销物料需避免未获批医疗功效表述',
    '2. 引用来源: 拉美合规准入指南 · 3C 营销话术规范',
    '3. 建议: 提交 MKT 合规复核后再对外发布',
  ].join('\n');
}

export function buildDeliverables(
  type: 'marketing' | 'knowledge',
  query = '',
): DeliverableItem[] {
  if (type === 'marketing') {
    return [
      {
        id: 'm-xlsx',
        icon: 'fa-file-excel',
        iconClass: 'text-emerald-600',
        name: 'Q3归因报告.xlsx',
        size: '842 KB',
        onDownload: () => {
          downloadBlob('Q3归因报告.csv', marketingReportCsv(query), 'text/csv;charset=utf-8');
        },
      },
      {
        id: 'm-pdf',
        icon: 'fa-file-pdf',
        iconClass: 'text-red-500',
        name: '策略摘要.pdf',
        size: '126 KB',
        onDownload: () => {
          downloadBlob('策略摘要.txt', marketingSummaryText(query), 'text/plain;charset=utf-8');
        },
      },
      {
        id: 'm-json',
        icon: 'fa-file-code',
        iconClass: 'text-claw-600',
        name: '分析快照.json',
        size: '24 KB',
        onDownload: () => {
          downloadBlob(
            'marketing-artifact.json',
            JSON.stringify(
              {
                type: 'marketing-board-v1',
                query,
                exportedAt: new Date().toISOString(),
                metrics: { soGrowth: 8.2, topRegion: '墨西哥' },
              },
              null,
              2,
            ),
          );
        },
      },
    ];
  }

  return [
    {
      id: 'k-doc',
      icon: 'fa-file-word',
      iconClass: 'text-blue-500',
      name: '检索摘要.docx',
      size: '48 KB',
      onDownload: () => {
        downloadBlob('检索摘要.txt', knowledgeSummaryDoc(query), 'text/plain;charset=utf-8');
      },
    },
    {
      id: 'k-json',
      icon: 'fa-file-code',
      iconClass: 'text-claw-600',
      name: '溯源卡片.json',
      size: '18 KB',
      onDownload: () => {
        downloadBlob(
          'knowledge-artifact.json',
          JSON.stringify(
            {
              type: 'knowledge-card-v1',
              query,
              exportedAt: new Date().toISOString(),
              citations: ['拉美合规准入指南', '3C 营销话术规范'],
            },
            null,
            2,
          ),
        );
      },
    },
  ];
}
