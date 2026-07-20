/** 轻量 Markdown → HTML（保留完整内容，用于交付件排版） */

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineFormat(text: string): string {
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // 单星号斜体（避开已处理的 strong 标记）
  s = s.replace(/(^|[\s（(「])\*([^*\n]+)\*(?=[\s）)」.,，。!！?？]|$)/g, '$1<em>$2</em>');
  return s;
}

function splitTableCells(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.includes('-')) return false;
  // |---|---| 或 | :--- | ---: |
  return /^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(t) || /^\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(t);
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  if (!t.includes('|')) return false;
  if (isTableSeparator(t)) return true;
  const cells = splitTableCells(t);
  return cells.length >= 2 && cells.some((c) => c.length > 0);
}

/** 模型偶发把整张表挤成一行：拆成多行 GFM 表 */
function explodeJammedTableLine(line: string): string[] | null {
  const t = line.trim();
  if (!t.includes('|') || !/\|[\t ]*:?-{3,}/.test(t)) return null;

  const sepRe = /\|?(?:\s*:?-{3,}:?\s*\|)+(?:\s*:?-{3,}:?\s*)?\|?/;
  const sepMatch = sepRe.exec(t);
  if (!sepMatch || sepMatch.index == null) return null;

  const headerPart = t.slice(0, sepMatch.index).trim();
  const sepPart = sepMatch[0].trim().startsWith('|') ? sepMatch[0].trim() : `|${sepMatch[0].trim()}`;
  let dataPart = t.slice(sepMatch.index + sepMatch[0].length).trim();
  if (!headerPart.includes('|')) return null;

  const headerCells = splitTableCells(headerPart);
  const colCount = headerCells.length;
  if (colCount < 2) return null;

  const rows = [
    headerPart.startsWith('|') ? headerPart : `| ${headerPart} |`,
    sepPart.endsWith('|') ? sepPart : `${sepPart}|`,
  ];

  if (!dataPart) return rows;

  // 行与行之间常见空单元格：`| 上一行末 | | 下一行首 |`
  const roughRows = dataPart
    .split(/\|\s*\|/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const withPipes = chunk.startsWith('|') ? chunk : `| ${chunk}`;
      return withPipes.endsWith('|') ? withPipes : `${withPipes} |`;
    });

  if (roughRows.length >= 1) {
    rows.push(...roughRows);
    return rows;
  }

  // 兜底：按表头列数切分单元格
  const cells = splitTableCells(dataPart.startsWith('|') ? dataPart : `| ${dataPart}`);
  for (let i = 0; i + colCount <= cells.length; i += colCount) {
    const slice = cells.slice(i, i + colCount);
    if (slice.every((c) => !c)) continue;
    rows.push(`| ${slice.join(' | ')} |`);
  }
  return rows.length >= 3 ? rows : null;
}

function renderTable(rows: string[]): string {
  const cleaned = rows.map((r) => r.trim()).filter(Boolean);
  if (cleaned.length < 2) return '';

  let headerLine = cleaned[0]!;
  let bodyLines = cleaned.slice(1);
  if (bodyLines[0] && isTableSeparator(bodyLines[0])) {
    bodyLines = bodyLines.slice(1);
  }

  const headers = splitTableCells(headerLine);
  if (headers.length < 2) return '';

  const thead = `<thead><tr>${headers.map((h) => `<th>${inlineFormat(h)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${bodyLines
    .filter((r) => !isTableSeparator(r))
    .map((r) => {
      const cells = splitTableCells(r);
      // 列数对齐
      while (cells.length < headers.length) cells.push('');
      return `<tr>${cells
        .slice(0, headers.length)
        .map((c) => `<td>${inlineFormat(c)}</td>`)
        .join('')}</tr>`;
    })
    .join('')}</tbody>`;

  return `<div class="md-table-wrap"><table class="md-table">${thead}${tbody}</table></div>`;
}

/** 将完整 Markdown 转为语义化 HTML 片段（不含 html/body 外壳） */
export function markdownToHtmlFragment(markdown: string): string {
  // 先拆开「挤成一行」的 GFM 表，避免被段落合并成乱码
  const normalized = markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .flatMap((line) => explodeJammedTableLine(line) ?? [line]);

  const lines = normalized;
  const out: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let para: string[] = [];

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(' ').trim();
    if (text) out.push(`<p>${inlineFormat(text)}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const raw = lines[i] ?? '';
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      closeLists();
      i += 1;
      continue;
    }

    // GFM 表格：表头 + 分隔行 + 数据行
    if (isTableRow(trimmed)) {
      const next = (lines[i + 1] ?? '').trim();
      const looksLikeTable =
        isTableSeparator(trimmed) ||
        isTableSeparator(next) ||
        (isTableRow(next) && trimmed.includes('|') && next.includes('|'));

      if (looksLikeTable || isTableSeparator(next)) {
        flushPara();
        closeLists();
        const tableRows: string[] = [];
        while (i < lines.length && isTableRow((lines[i] ?? '').trim())) {
          tableRows.push((lines[i] ?? '').trim());
          i += 1;
        }
        // 至少要有表头；若首行是分隔符则丢弃无效块
        if (tableRows.length >= 2 && !isTableSeparator(tableRows[0]!)) {
          out.push(renderTable(tableRows));
        } else if (tableRows.length >= 3) {
          out.push(renderTable(tableRows.slice(1)));
        }
        continue;
      }
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flushPara();
      closeLists();
      out.push('<hr/>');
      i += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushPara();
      closeLists();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inlineFormat(heading[2]!)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushPara();
      closeLists();
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test((lines[i] ?? '').trim())) {
        quoteLines.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${inlineFormat(quoteLines.join(' '))}</blockquote>`);
      continue;
    }

    const ul = /^[-*·]\s+(.+)$/.exec(trimmed);
    if (ul) {
      flushPara();
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul>');
        inUl = true;
      }
      out.push(`<li>${inlineFormat(ul[1]!)}</li>`);
      i += 1;
      continue;
    }

    const ol = /^(\d+)[.)]\s+(.+)$/.exec(trimmed);
    if (ol) {
      const title = ol[2]!.trim();
      // 「2. 核心指标表」这类短标题按小节标题，而不是有序列表
      const asSectionTitle =
        title.length <= 48 &&
        !/[。；;！？!?]$/.test(title) &&
        (/表|图|归因|建议|结论|摘要|指标|分析|说明|概况|概述|TOP|可视化/.test(title) ||
          title.length <= 24);

      flushPara();
      if (asSectionTitle) {
        closeLists();
        out.push(`<h3>${inlineFormat(title)}</h3>`);
        i += 1;
        continue;
      }

      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol>');
        inOl = true;
      }
      out.push(`<li>${inlineFormat(title)}</li>`);
      i += 1;
      continue;
    }

    closeLists();
    para.push(trimmed);
    i += 1;
  }

  flushPara();
  closeLists();
  return out.join('\n');
}

export function parseMarkdownSections(markdown: string): { heading: string; body: string; level: number }[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections: { heading: string; body: string; level: number }[] = [];
  let heading = '';
  let level = 1;
  let body: string[] = [];
  let sawHeading = false;

  const flush = () => {
    const text = body.join('\n').trim();
    if (!sawHeading && !text) return;
    sections.push({
      heading: heading || (sections.length === 0 ? '概述' : `要点 ${sections.length + 1}`),
      body: text,
      level,
    });
    body = [];
  };

  for (const line of lines) {
    const m = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (m) {
      if (sawHeading || body.some((l) => l.trim())) flush();
      heading = m[2]!.trim();
      level = m[1]!.length;
      sawHeading = true;
      continue;
    }
    body.push(line);
  }
  flush();
  return sections;
}

/** 从段落提取幻灯片要点，尽量保留原文信息 */
export function extractBullets(body: string, max = 10): string[] {
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets: string[] = [];

  for (const line of lines) {
    if (/^---+$/.test(line) || /^>\s?/.test(line)) continue;
    // 跳过 Markdown 表格行，避免把 | 管道符塞进要点
    if (isTableRow(line) || isTableSeparator(line)) continue;
    const list = line.replace(/^[-*·]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
    const cleaned = list
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();
    if (!cleaned) continue;
    // 长段落按句号拆成多条，避免一整段挤在一条 bullet
    if (!/^[-*·\d]/.test(line) && cleaned.length > 90 && /[。；;]/.test(cleaned)) {
      const parts = cleaned.split(/(?<=[。；;])\s*/).map((p) => p.trim()).filter((p) => p.length >= 6);
      for (const p of parts) {
        bullets.push(p.length > 140 ? `${p.slice(0, 138)}…` : p);
        if (bullets.length >= max) return bullets;
      }
      continue;
    }
    bullets.push(cleaned.length > 140 ? `${cleaned.slice(0, 138)}…` : cleaned);
    if (bullets.length >= max) break;
  }

  if (!bullets.length) {
    const plain = body.replace(/\s+/g, ' ').trim();
    if (plain) bullets.push(plain.length > 140 ? `${plain.slice(0, 138)}…` : plain);
  }
  return bullets;
}
