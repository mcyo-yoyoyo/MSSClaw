import { strToU8, zipSync } from 'fflate';
import type { PptSlide } from '@/domain/pptSlides';

function escXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function downloadBinary(filename: string, data: Uint8Array, mime: string) {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const blob = new Blob([copy], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 简易文本 run */
function textBody(lines: { text: string; size?: number; bold?: boolean; color?: string }[], align = 'l') {
  const paragraphs = lines
    .map((line, idx) => {
      const sz = (line.size ?? 18) * 100;
      const b = line.bold ? '<a:b/>' : '';
      const color = line.color ?? '1A1A1A';
      return `<a:p>
  <a:pPr algn="${align}">
    <a:spcBef><a:spcPts val="${idx === 0 ? 0 : 120}"/></a:spcBef>
  </a:pPr>
  <a:r>
    <a:rPr lang="zh-CN" sz="${sz}" dirty="0">${b}<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
      <a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/>
    </a:rPr>
    <a:t>${escXml(line.text)}</a:t>
  </a:r>
  <a:endParaRPr lang="zh-CN" sz="${sz}"/>
</a:p>`;
    })
    .join('');
  return `<p:txBody><a:bodyPr/><a:lstStyle/>${paragraphs}</p:txBody>`;
}

let shapeIdSeq = 10;
function nextShapeId() {
  shapeIdSeq += 1;
  return shapeIdSeq;
}

function shapeRect(opts: {
  x: number;
  y: number;
  cx: number;
  cy: number;
  fill: string;
  lines?: { text: string; size?: number; bold?: boolean; color?: string }[];
  align?: string;
}) {
  const body = opts.lines?.length
    ? textBody(opts.lines, opts.align ?? 'l')
    : `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody>`;
  return `<p:sp>
  <p:nvSpPr><p:cNvPr id="${nextShapeId()}" name="Shape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="${opts.x}" y="${opts.y}"/><a:ext cx="${opts.cx}" cy="${opts.cy}"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:solidFill><a:srgbClr val="${opts.fill}"/></a:solidFill>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  ${body}
</p:sp>`;
}

/** EMUs: 914400 = 1 inch; 16:9 slide = 12192000 x 6858000 */
const SW = 12192000;
const SH = 6858000;
const HW_RED = 'CF0A2C';
const INK = '1A1A1A';
const MUTE = '595959';
const SOFT = 'F7F7F7';

function buildCoverSlide(slide: PptSlide): string {
  const meta = (slide.meta ?? []).slice(0, 3);
  const shapes = [
    shapeRect({ x: 0, y: 0, cx: 720000, cy: SH, fill: HW_RED }),
    shapeRect({
      x: 1100000,
      y: 900000,
      cx: 9500000,
      cy: 500000,
      fill: 'FFFFFF',
      lines: [{ text: 'HUAWEI STYLE · MSS CLAW', size: 12, bold: true, color: HW_RED }],
    }),
    shapeRect({
      x: 1100000,
      y: 2200000,
      cx: 9800000,
      cy: 1600000,
      fill: 'FFFFFF',
      lines: [
        { text: slide.subtitle || '智能交付汇报', size: 14, color: MUTE },
        { text: slide.title || '业务汇报', size: 36, bold: true, color: INK },
      ],
    }),
    shapeRect({ x: 1100000, y: 4000000, cx: 1200000, cy: 60000, fill: HW_RED }),
    ...meta.map((m, i) =>
      shapeRect({
        x: 1100000,
        y: 4300000 + i * 420000,
        cx: 9000000,
        cy: 380000,
        fill: 'FFFFFF',
        lines: [{ text: m, size: 13, color: MUTE }],
      }),
    ),
  ];
  return slideXml(shapes.join(''));
}

function buildClosingSlide(slide: PptSlide): string {
  const shapes = [
    shapeRect({ x: 0, y: 0, cx: SW, cy: 120000, fill: HW_RED }),
    shapeRect({
      x: 1200000,
      y: 2200000,
      cx: 9800000,
      cy: 2200000,
      fill: 'FFFFFF',
      align: 'ctr',
      lines: [
        { text: slide.title || '谢谢', size: 48, bold: true, color: INK },
        { text: slide.subtitle || 'Thank You', size: 18, bold: true, color: HW_RED },
        ...(slide.bullets.slice(0, 2).map((b) => ({ text: b, size: 13, color: MUTE })) as {
          text: string;
          size: number;
          color: string;
        }[]),
      ],
    }),
    shapeRect({
      x: 0,
      y: SH - 700000,
      cx: SW,
      cy: 700000,
      fill: SOFT,
      align: 'ctr',
      lines: [{ text: (slide.meta ?? ['MSS Claw']).join(' · '), size: 11, color: MUTE }],
    }),
  ];
  return slideXml(shapes.join(''));
}

function buildContentSlide(slide: PptSlide): string {
  const bullets = slide.bullets.slice(0, 6);
  const isMetrics = slide.layout === 'metrics';
  const cardShapes = isMetrics
    ? bullets.map((b, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const m = b.match(/([+-]?\d+(?:\.\d+)?%|#\d+|第\s*\d+)/);
        const value = m?.[1] || String(i + 1);
        const label = b.replace(value, '').replace(/^[:：\s-]+/, '').trim() || b;
        const x = 700000 + col * 3700000;
        const y = 1800000 + row * 2000000;
        return shapeRect({
          x,
          y,
          cx: 3400000,
          cy: 1700000,
          fill: SOFT,
          lines: [
            { text: label.slice(0, 28), size: 11, color: MUTE },
            { text: value, size: 28, bold: true, color: HW_RED },
          ],
        });
      })
    : bullets.map((b, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 700000 + col * 5600000;
        const y = 1700000 + row * 1400000;
        return [
          shapeRect({ x, y, cx: 120000, cy: 1200000, fill: HW_RED }),
          shapeRect({
            x: x + 120000,
            y,
            cx: 5000000,
            cy: 1200000,
            fill: SOFT,
            lines: [
              { text: String(i + 1).padStart(2, '0'), size: 11, bold: true, color: HW_RED },
              { text: b.slice(0, 80), size: 13, color: INK },
            ],
          }),
        ].join('');
      });

  const shapes = [
    shapeRect({ x: 0, y: 0, cx: SW, cy: 90000, fill: HW_RED }),
    shapeRect({
      x: 700000,
      y: 400000,
      cx: 10000000,
      cy: 1100000,
      fill: 'FFFFFF',
      lines: [
        { text: slide.subtitle || (slide.role === 'agenda' ? 'AGENDA' : 'KEY POINTS'), size: 11, bold: true, color: HW_RED },
        { text: slide.title, size: 24, bold: true, color: INK },
      ],
    }),
    ...(Array.isArray(cardShapes) ? cardShapes : [cardShapes]),
  ];
  return slideXml(shapes.flat().join(''));
}

function slideXml(spTreeInner: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${spTreeInner}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function buildSlideXml(slide: PptSlide): string {
  shapeIdSeq = 10;
  if (slide.role === 'cover' || slide.layout === 'cover') return buildCoverSlide(slide);
  if (slide.role === 'closing' || slide.layout === 'closing') return buildClosingSlide(slide);
  return buildContentSlide(slide);
}

const CONTENT_TYPES = (n: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${Array.from({ length: n }, (_, i) =>
    `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
  ).join('\n  ')}
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const PRESENTATION = (n: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
 saveSubsetFonts="1">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${Array.from({ length: n }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('\n    ')}
  </p:sldIdLst>
  <p:sldSz cx="${SW}" cy="${SH}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

const PRESENTATION_RELS = (n: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${Array.from({ length: n }, (_, i) =>
    `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
  ).join('\n  ')}
  <Relationship Id="rId${n + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;

const SLIDE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

const SLIDE_LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

const SLIDE_LAYOUT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const SLIDE_MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;

const SLIDE_MASTER_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="MSSClaw">
  <a:themeElements>
    <a:clrScheme name="MSS">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1A1A1A"/></a:dk2>
      <a:lt2><a:srgbClr val="F7F7F7"/></a:lt2>
      <a:accent1><a:srgbClr val="CF0A2C"/></a:accent1>
      <a:accent2><a:srgbClr val="A10822"/></a:accent2>
      <a:accent3><a:srgbClr val="595959"/></a:accent3>
      <a:accent4><a:srgbClr val="8C8C8C"/></a:accent4>
      <a:accent5><a:srgbClr val="D9D9D9"/></a:accent5>
      <a:accent6><a:srgbClr val="E5E5E5"/></a:accent6>
      <a:hlink><a:srgbClr val="CF0A2C"/></a:hlink>
      <a:folHlink><a:srgbClr val="A10822"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="MSS">
      <a:majorFont><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="MSS">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

function coreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>MSS Claw PPT</dc:title>
  <dc:creator>MSS Claw</dc:creator>
  <cp:lastModifiedBy>MSS Claw</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function appXml(n: number) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>MSS Claw</Application>
  <Slides>${n}</Slides>
</Properties>`;
}

/** 将幻灯片打包为可打开的 .pptx（OOXML + zip） */
export function buildPptxBytes(slides: PptSlide[]): Uint8Array {
  const list = slides.length ? slides : [{ title: '空演示', bullets: [], role: 'content' as const }];
  const n = list.length;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(CONTENT_TYPES(n)),
    '_rels/.rels': strToU8(ROOT_RELS),
    'docProps/core.xml': strToU8(coreXml()),
    'docProps/app.xml': strToU8(appXml(n)),
    'ppt/presentation.xml': strToU8(PRESENTATION(n)),
    'ppt/_rels/presentation.xml.rels': strToU8(PRESENTATION_RELS(n)),
    'ppt/slideLayouts/slideLayout1.xml': strToU8(SLIDE_LAYOUT),
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': strToU8(SLIDE_LAYOUT_RELS),
    'ppt/slideMasters/slideMaster1.xml': strToU8(SLIDE_MASTER),
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': strToU8(SLIDE_MASTER_RELS),
    'ppt/theme/theme1.xml': strToU8(THEME),
  };

  list.forEach((slide, i) => {
    const idx = i + 1;
    files[`ppt/slides/slide${idx}.xml`] = strToU8(buildSlideXml(slide));
    files[`ppt/slides/_rels/slide${idx}.xml.rels`] = strToU8(SLIDE_RELS);
  });

  return zipSync(files, { level: 6 });
}

export function downloadPptx(filename: string, slides: PptSlide[]) {
  const name = filename.toLowerCase().endsWith('.pptx') ? filename : `${filename}.pptx`;
  const bytes = buildPptxBytes(slides);
  downloadBinary(
    name,
    bytes,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  );
}
