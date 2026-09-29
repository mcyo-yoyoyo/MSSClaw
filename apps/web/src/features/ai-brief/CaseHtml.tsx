import type { SyntheticEvent } from 'react';

type CasebookTab = 'cases' | 'topics';

export function CaseHtml({ html, title, onNavigate, baseHref, simplifyCasebookNavigation = false, standalone = false }: {
  html: string;
  title: string;
  onNavigate?: (tab: CasebookTab) => void;
  baseHref?: string;
  simplifyCasebookNavigation?: boolean;
  standalone?: boolean;
}) {
  const srcDoc = baseHref && !/<base\b/i.test(html)
    ? html.replace(/<head\b[^>]*>/i, (head) => `${head}<base href="${baseHref.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`)
    : html;

  const handleFrameLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    const frame = event.currentTarget;
    const document = frame.contentDocument;
    if (!document) return;
    if (simplifyCasebookNavigation) {
      document.querySelectorAll<HTMLAnchorElement>('a').forEach((anchor) => {
        const href = anchor.getAttribute('href') ?? '';
        const filename = href.split(/[?#]/)[0]?.split('/').pop()?.toLowerCase();
        const tab = anchor.dataset.casebookTab ?? (filename === 'index.html' ? 'cases' : filename === 'topics.html' ? 'topics' : undefined);
        if (tab === 'topics') anchor.remove();
        else if (tab === 'cases') anchor.textContent = anchor.textContent?.replace(/开天眼/g, '案例列表') ?? '返回案例列表';
      });
    }
    document.addEventListener('click', (clickEvent) => {
      const target = clickEvent.target as Element | null;
      const printButton = target?.closest?.('.pdf-action');
      if (printButton) {
        clickEvent.preventDefault();
        frame.contentWindow?.print();
        return;
      }
      const anchor = target?.closest?.<HTMLAnchorElement>('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      const filename = href.split(/[?#]/)[0]?.split('/').pop()?.toLowerCase();
      const tab = anchor.dataset.casebookTab ?? (filename === 'index.html' ? 'cases' : filename === 'topics.html' ? 'topics' : undefined);
      if (tab === 'cases' || tab === 'topics') {
        clickEvent.preventDefault();
        onNavigate?.(tab);
      }
    }, true);
  };

  return (
    <iframe
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
      referrerPolicy="no-referrer"
      className="block w-full border-0 bg-white"
      onLoad={handleFrameLoad}
      style={{ height: standalone ? '100vh' : 'calc(100vh - 190px)', minHeight: standalone ? 0 : 640 }}
    />
  );
}
