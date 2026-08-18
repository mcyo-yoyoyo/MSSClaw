/**
 * AI 快讯邮件模板 · 页脚 CTA / 品牌文案（门户运营可配）
 * 快讯正文仍来自当日数据源；此处只控制邮件壳与落地引导。
 */

export type AiBriefEmailCopy = {
  /** 邮件头品牌行 */
  brandLabel: string;
  /** 邮件主标题 */
  headline: string;
  /** 日期行后缀，如「精选产业动态速读」 */
  dateSuffix: string;
  /** CTA 标题，如「学工具、用工具、造工具」 */
  ctaTitle: string;
  /** CTA 说明 */
  ctaBlurb: string;
  /** 按钮文案，如「进入 MSS AI平台」 */
  ctaButtonLabel: string;
  /**
   * 平台落地链接。留空则下载时回退到当前站点 origin。
   * 正式对外发信建议填稳定公网地址。
   */
  platformUrl: string;
  /** 页脚说明 */
  footerNote: string;
};

export const DEFAULT_AI_BRIEF_EMAIL_COPY: AiBriefEmailCopy = {
  brandLabel: 'MSS AI 提效作战平台',
  headline: 'MSS AI快讯',
  dateSuffix: '精选产业动态速读',
  ctaTitle: '学工具、用工具、造工具',
  ctaBlurb: '打开平台浏览外部工具精选、内部办公推荐与 MSS 工具集市。',
  ctaButtonLabel: '进入 MSS AI平台',
  platformUrl: '',
  footerNote:
    '本邮件由平台生成模板，可粘贴至企业邮箱人工发送。WeLink / SMTP 自动推送待开通。',
};

/** 解析最终落地 URL：配置优先，其次运行时 origin，最后兜底 */
export function resolveAiBriefPlatformUrl(
  configured: string | undefined,
  runtimeOrigin?: string,
): string {
  const fromConfig = (configured ?? '').trim();
  if (fromConfig) return fromConfig;
  const fromRuntime = (runtimeOrigin ?? '').trim();
  if (fromRuntime) return fromRuntime;
  return 'https://mssclaw.vercel.app';
}
