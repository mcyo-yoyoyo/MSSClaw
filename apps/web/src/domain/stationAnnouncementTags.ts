/**
 * 站内公告标签：运营自由填写（早期是 AI上线 / AI培训 两个固定枚举）。
 * 标签只是给标题加一个前缀色标，不参与任何过滤逻辑，所以空标签也是合法的。
 *
 * 颜色：运营在编辑弹窗里选（预设色板 + 取色器）；没选就按标签文字自动取色，
 * 保证同一个标签在首页、运营列表、预览里始终同色。
 */

const TAG_MAX_LENGTH = 12;

/** 旧枚举值：首版没有 AI 前缀，读到时补齐，避免历史公告显示成两种写法 */
const LEGACY_TAGS: Record<string, string> = {
  上线: 'AI上线',
  培训: 'AI培训',
};

export interface AnnouncementTagPreset {
  value: string;
  label: string;
}

/** 预设色板：深色文字，放在白底和 10% 同色底上都够对比度 */
export const ANNOUNCEMENT_TAG_PRESET_COLORS: AnnouncementTagPreset[] = [
  { value: '#c8102e', label: '品牌红' },
  { value: '#e85d04', label: '橙' },
  { value: '#0369a1', label: '蓝' },
  { value: '#047857', label: '绿' },
  { value: '#92400e', label: '棕' },
  { value: '#52525b', label: '灰' },
];

/** 这两个标签用惯了固定色，改成自填标签后颜色保持不变 */
const PINNED_COLORS: Record<string, string> = {
  AI上线: '#c8102e',
  AI培训: '#e85d04',
};

const DEFAULT_COLOR = '#52525b';

/** 去空白、套用历史枚举映射、限长；留空表示这条公告不展示标签 */
export function normalizeAnnouncementTag(value: unknown): string {
  const raw = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!raw) return '';
  return (LEGACY_TAGS[raw] ?? raw).slice(0, TAG_MAX_LENGTH);
}

/** 归一化 16 进制色值；非法值返回空串，表示「自动配色」 */
export function normalizeAnnouncementColor(value: unknown): string {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return '';
}

/** 标签颜色：运营选过就用运营选的，否则按标签内容取色（同标签处处同色） */
export function announcementTagColor(tag: string, explicit?: unknown): string {
  const chosen = normalizeAnnouncementColor(explicit);
  if (chosen) return chosen;

  const normalized = normalizeAnnouncementTag(tag);
  if (!normalized) return DEFAULT_COLOR;
  const pinned = PINNED_COLORS[normalized];
  if (pinned) return pinned;

  let hash = 0;
  for (const char of normalized) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 100_003;
  }
  return ANNOUNCEMENT_TAG_PRESET_COLORS[hash % ANNOUNCEMENT_TAG_PRESET_COLORS.length].value;
}

/** 运营列表里的标签胶囊：同色 10% 做底，深色文字保证可读 */
export function announcementTagChipStyle(color: string): {
  color: string;
  backgroundColor: string;
} {
  return { color, backgroundColor: `${color}1a` };
}

export const ANNOUNCEMENT_TAG_MAX_LENGTH = TAG_MAX_LENGTH;
/** 标题在首页只露一行，超出会被截断；运营端按这个长度给软提示 */
export const ANNOUNCEMENT_TITLE_SOFT_LIMIT = 24;
