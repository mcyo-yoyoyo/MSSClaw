/**
 * AI 快讯邮件模板：浏览器侧无法直连企业邮箱时，下载 HTML 供人工发送。
 * 真实推送需后端邮件服务（Resend / SendGrid / 企业 SMTP）+ API Key。
 * 页脚 CTA / 品牌文案由门户运营配置（AiBriefEmailCopy）。
 */

import type { AiBotDailyNewsPayload } from '@/domain/aiBotDailyNews';
import { flattenAiBotNews } from '@/domain/aiBotDailyNews';
import {
  DEFAULT_AI_BRIEF_EMAIL_COPY,
  resolveAiBriefPlatformUrl,
  type AiBriefEmailCopy,
} from '@/domain/aiBriefEmailCopy';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildAiBriefEmailHtml(input: {
  payload: AiBotDailyNewsPayload;
  /** 运行时 origin，配置为空时回退 */
  runtimeOrigin?: string;
  copy?: Partial<AiBriefEmailCopy>;
  /** @deprecated 请用 copy.platformUrl；保留兼容旧调用 */
  platformUrl?: string;
  /** 只取最近 N 条，默认 12 */
  limit?: number;
}): string {
  const copy: AiBriefEmailCopy = {
    ...DEFAULT_AI_BRIEF_EMAIL_COPY,
    ...input.copy,
  };
  const items = flattenAiBotNews(input.payload).slice(0, input.limit ?? 12);
  const dateLabel = input.payload.groups[0]?.dateLabel || '今日';
  const platformUrl = resolveAiBriefPlatformUrl(
    copy.platformUrl || input.platformUrl,
    input.runtimeOrigin,
  );
  const rows = items.length
    ? items
        .map((item, i) => {
          const title = escapeHtml(item.title);
          const summary = escapeHtml((item.summary || '').trim());
          const url = escapeHtml(item.url || platformUrl);
          return `
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid #ececef;vertical-align:top;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="36" style="vertical-align:top;padding-top:2px;">
                      <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#f4f4f5;color:#71717a;font:600 12px/28px ui-monospace,Menlo,monospace;">${String(i + 1).padStart(2, '0')}</span>
                    </td>
                    <td style="padding-left:10px;">
                      <a href="${url}" style="color:#18181b;text-decoration:none;font:650 15px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${title}</a>
                      ${summary ? `<p style="margin:6px 0 0;color:#71717a;font:400 13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${summary}</p>` : ''}
                      <p style="margin:8px 0 0;"><a href="${url}" style="color:#0071e3;font:600 12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-decoration:none;">阅读原文 →</a></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
        })
        .join('')
    : `<tr><td style="padding:24px 0;color:#a1a1aa;font:13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">暂无快讯内容</td></tr>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(copy.headline)} · ${escapeHtml(dateLabel)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(24,24,27,0.08);">
          <tr>
            <td style="padding:28px 28px 18px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#0c4a6e 100%);">
              <p style="margin:0;color:rgba(255,255,255,0.65);font:600 11px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.brandLabel)}</p>
              <h1 style="margin:10px 0 0;color:#fff;font:650 26px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:-0.03em;">${escapeHtml(copy.headline)}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.78);font:400 13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(dateLabel)} · ${escapeHtml(copy.dateSuffix)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:14px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0;color:#3f3f46;font:650 14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(copy.ctaTitle)}</p>
                    <p style="margin:6px 0 14px;color:#71717a;font:400 12px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(copy.ctaBlurb)}</p>
                    <a href="${escapeHtml(platformUrl)}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#18181b;color:#fff;font:650 12px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-decoration:none;">${escapeHtml(copy.ctaButtonLabel)}</a>
                    <p style="margin:12px 0 0;color:#a1a1aa;font:400 11px/1.4 ui-monospace,Menlo,monospace;word-break:break-all;">${escapeHtml(platformUrl)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;color:#a1a1aa;font:400 11px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(copy.footerNote)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function downloadAiBriefEmailTemplate(html: string, dateLabel?: string) {
  const stamp = (dateLabel || new Date().toISOString().slice(0, 10)).replace(/[^\d-]/g, '');
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MSS-AI快讯-${stamp || 'brief'}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
