import sharp from 'sharp';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const out = path.join(repoRoot, 'apps/web/public/agent-avatars');
mkdirSync(out, { recursive: true });
const src = path.join(__dirname, 'agent-avatar-source-sheet.jpg');

/** Keep existing culture ids/labels; only swap image pixels from sheet order 01→20 */
const ids = [
  'hw-chengxin',
  'hw-houde',
  'hw-mingyuan',
  'hw-ruisi',
  'hw-duxing',
  'hw-jingye',
  'hw-zhuoyue',
  'hw-tuozhan',
  'hw-shouzheng',
  'hw-xieli',
  'hw-wenjian',
  'hw-kaiwu',
  'hw-zhicheng',
  'hw-qianxue',
  'hw-lixing',
  'hw-hengyi',
  'hw-guanghua',
  'hw-qinglan',
  'hw-songbo',
  'hw-xingzhi',
];

const { width: W, height: H } = await sharp(src).metadata();
const top = 96;
const bottom = 655;
const left = 22;
const right = 1002;
const cols = 5;
const rows = 4;
const cellW = (right - left) / cols;
const cellH = (bottom - top) / rows;
const size = Math.round(Math.min(cellW * 0.46, cellH * 0.7));
const finalSize = 256;

const maskSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${finalSize}" height="${finalSize}">
    <circle cx="${finalSize / 2}" cy="${finalSize / 2}" r="${finalSize / 2}" fill="white"/>
  </svg>`,
);
const mask = await sharp(maskSvg).png().toBuffer();

for (let i = 0; i < 20; i++) {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const cx = left + cellW * c + cellW * 0.305;
  const cy = top + cellH * r + cellH * 0.45;
  const leftCrop = Math.max(0, Math.round(cx - size / 2));
  const topCrop = Math.max(0, Math.round(cy - size / 2));
  const s = Math.min(size, W - leftCrop, H - topCrop);

  const square = await sharp(src)
    .extract({ left: leftCrop, top: topCrop, width: s, height: s })
    .resize(finalSize, finalSize)
    .ensureAlpha()
    .png()
    .toBuffer();

  await sharp(square)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(path.join(out, `${ids[i]}.png`));
}

console.log('wrote', ids.length, 'avatars to', out, { cellW, cellH, size });
