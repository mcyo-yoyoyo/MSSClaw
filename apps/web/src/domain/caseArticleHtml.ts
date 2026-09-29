const ARTICLE_STYLE = `
  :root { --bg: #fff; --ink: #18181b; --muted: #71717a; --line: #e4e4e7; --panel: #fff; --dark: #18181b; }
  html, body.reader-page { background: #fff !important; }
  body.reader-page, .reader-page button, .reader-page a { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  .reader-shell { max-width: 1040px; padding: 32px 24px 64px; }
  .reader-card { border-radius: 0; box-shadow: none; }
  .reader-content h1, .reader-content h2, .reader-content h3,
  .dimension-number, .metric-strip strong, .case-timeline span,
  .digest-number, .outline-list li::before { font-family: inherit; letter-spacing: 0; }
  .reader-meta, .reader-foot { color: #71717a; }
  .core-label, .case-v2-kicker, .dimension-number, .case-timeline span,
  .scene-level { color: #0064c8; }
  .reader-page .core-summary, .reader-page .case-analysis p,
  .reader-page .dimension-fields dd, .reader-page .case-v2-lead,
  .reader-page .fact-grid p, .reader-page .case-matrix-row > div,
  .reader-page .value-table-row > div, .reader-page .scene-item > div,
  .reader-page .outline-list li, .reader-page .digest-item p,
  .reader-page .reader-section p { color: #3f3f46; }
  .reader-page .tags span { color: #52525b; background: #fafafa; }
  .reader-page .tags .mss-primary-tag { background: #18181b; color: #fff; border-color: #18181b; }
  .reader-page .tags .mss-related-tag { background: #f4f4f5; color: #3f3f46; border-color: #e4e4e7; }
  .reader-links .primary, .reader-links .pdf-action { border-radius: 6px; background: #18181b; border-color: #18181b; color: #fff; }
  .reader-page a:not(.primary) { color: #0064c8; }
  .mss-source-link { display: block; max-width: 820px; margin: 24px auto 48px; padding: 18px 24px; border-top: 1px solid #e4e4e7; color: #0064c8; font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  @media (max-width: 720px) { .reader-shell { padding: 16px 12px 36px; } }
`;

export function prepareCaseArticleHtml(html: string, sourceUrl = ''): string {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('.reader-top').forEach((element) => element.remove());
  document.querySelectorAll<HTMLAnchorElement>('a').forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? '';
    const casebookLink = /^\.\.\/(?:index|topics)\.html(?:[?#]|$)/i.test(href);
    if (anchor.dataset.casebookTab || casebookLink) {
      anchor.remove();
    }
  });
  if (sourceUrl.trim() && !document.querySelector('.source-access a[href^="http"], .reader-links a.primary[href^="http"]')) {
    const sourceLink = document.createElement('a');
    sourceLink.className = 'mss-source-link';
    sourceLink.href = sourceUrl.trim();
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.textContent = '查看原始来源';
    (document.querySelector('.reader-content') ?? document.body).append(sourceLink);
  }
  const style = document.createElement('style');
  style.textContent = ARTICLE_STYLE;
  document.head.append(style);
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}
