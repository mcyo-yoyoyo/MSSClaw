import { markdownToHtmlFragment } from '@/domain/markdownRender';

export function CaseMarkdown({ markdown }: { markdown: string }) {
  return (
    <div
      className="case-insight-prose"
      dangerouslySetInnerHTML={{ __html: markdownToHtmlFragment(markdown) }}
    />
  );
}
