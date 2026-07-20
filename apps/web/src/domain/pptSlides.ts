import { extractBullets, parseMarkdownSections } from '@/domain/markdownRender';

export type PptSlideRole = 'cover' | 'agenda' | 'content' | 'closing';

export type PptSlideLayout = 'cards' | 'metrics' | 'list' | 'cover' | 'closing';

export interface PptSlide {
  title: string;
  bullets: string[];
  role?: PptSlideRole;
  layout?: PptSlideLayout;
  subtitle?: string;
  meta?: string[];
}

function skillLine(skills?: string[]) {
  return skills?.length ? skills.join(' · ') : '';
}

function extractDocTitle(markdown: string, fallback: string) {
  const m = /^#\s+(.+)$/m.exec(markdown);
  return m?.[1]?.trim() || fallback;
}

function looksLikeMetric(text: string): boolean {
  return /[+-]?\d+(\.\d+)?%|#\d+|第\s*\d+|环比|同比|万元|GMV|SO\b/.test(text);
}

function inferLayout(bullets: string[]): PptSlideLayout {
  if (!bullets.length) return 'list';
  const metricHits = bullets.filter(looksLikeMetric).length;
  if (metricHits >= Math.ceil(bullets.length * 0.5) && bullets.length <= 6) return 'metrics';
  if (bullets.length <= 6) return 'cards';
  return 'list';
}

function shortenBullet(text: string, max = 72): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** 为幻灯片补齐华为风封面 + 结束页，并推断内容页布局 */
export function finalizePptDeck(
  slides: PptSlide[],
  opts?: {
    title?: string;
    agentName?: string;
    query?: string;
    skills?: string[];
  },
): PptSlide[] {
  const title = opts?.title?.trim() || slides[0]?.title || '业务汇报';
  const content = slides
    .filter((s) => s.role !== 'cover' && s.role !== 'closing')
    .filter((s) => !/谢谢|thank\s*you|致谢/i.test(s.title))
    .map((s) => ({
      ...s,
      role: (s.role || 'content') as PptSlideRole,
      layout: s.layout || inferLayout(s.bullets),
      bullets: s.bullets.map((b) => shortenBullet(b, 88)).slice(0, 6),
    }));

  // 去掉与封面重复的首屏纯标题页
  const body =
    content[0] &&
    content[0].title === title &&
    content[0].bullets.every((b) => /Agent|Skill|任务|基于/.test(b))
      ? content.slice(1)
      : content;

  const agendaBullets = body.slice(0, 5).map((s, i) => `${i + 1}. ${s.title}`);

  const cover: PptSlide = {
    role: 'cover',
    layout: 'cover',
    title,
    subtitle: 'MSS Claw · 智能交付汇报',
    bullets: [],
    meta: [
      opts?.agentName ? `汇报人：${opts.agentName}` : 'MSS AI 提效作战平台',
      opts?.skills?.length ? `能力：${skillLine(opts.skills)}` : '基于 Markdown 智能生成',
      opts?.query ? `议题：${opts.query.slice(0, 42)}` : new Date().toLocaleDateString('zh-CN'),
    ],
  };

  const agenda: PptSlide | null =
    agendaBullets.length >= 2
      ? {
          role: 'agenda',
          layout: 'cards',
          title: '汇报议程',
          subtitle: 'Agenda',
          bullets: agendaBullets,
        }
      : null;

  const closing: PptSlide = {
    role: 'closing',
    layout: 'closing',
    title: '谢谢',
    subtitle: 'Thank You',
    bullets: ['欢迎交流与反馈', 'MSS Claw · 让业务交付更高效'],
    meta: [opts?.agentName || 'MSS Claw', new Date().toLocaleDateString('zh-CN')],
  };

  return [cover, ...(agenda ? [agenda] : []), ...body.slice(0, 8), closing];
}

/** 从 Markdown 构建带封面/结束页的 PPT 大纲 */
export function buildPptDeckFromMarkdown(
  markdown: string,
  ctx?: { agentName?: string; query?: string; skills?: string[] },
): PptSlide[] {
  const sections = parseMarkdownSections(markdown);
  const docTitle = extractDocTitle(markdown, '业务汇报');
  const content: PptSlide[] = [];

  for (const section of sections) {
    if (section.level === 1 && section.heading === docTitle && !section.body.trim()) continue;
    const bullets = extractBullets(section.body, 8)
      .filter((b) => !b.includes('|') && !/^[-:]+$/.test(b))
      .map((b) => shortenBullet(b, 88));
    if (!bullets.length && section.level === 1) continue;
    // 跳过纯表格章节的空壳
    if (!bullets.length) continue;
    content.push({
      role: 'content',
      title: section.heading.replace(/^\d+[.)]\s*/, ''),
      bullets,
      layout: inferLayout(bullets),
    });
  }

  if (!content.length) {
    content.push({
      role: 'content',
      title: '核心要点',
      bullets: extractBullets(markdown, 6).map((b) => shortenBullet(b, 88)),
      layout: 'cards',
    });
  }

  return finalizePptDeck(content, {
    title: docTitle,
    agentName: ctx?.agentName,
    query: ctx?.query,
    skills: ctx?.skills,
  });
}
