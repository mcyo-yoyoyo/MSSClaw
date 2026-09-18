/**
 * 测试用 RAR 构造器：按 RAR4 / RAR5 格式规范手工拼「仅存储」（不压缩）的归档。
 * 本机没有 rar 打包工具（7z 只能解压），而解压算法由 unrar 自身负责，
 * 这里只需覆盖目录结构、文件名、标志位与大小字段。不依赖 Node API，浏览器里也能用。
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: ArrayLike<number>): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface RarFixtureEntry {
  /** 用 / 分隔；RAR4 按 Windows 习惯写成反斜杠 */
  name: string;
  /** 省略表示目录 */
  data?: Uint8Array | string;
  /** 覆盖文件头里的解压后大小，用来构造超限包；数据区仍写真实内容 */
  declaredSize?: number;
  /** 仅 RAR4：设置文件头的加密标志 */
  encrypted?: boolean;
}

export interface RarFixtureOptions {
  /** 设置归档头的分卷标志 */
  volume?: boolean;
}

const encoder = new TextEncoder();

function entryBytes(entry: RarFixtureEntry): Uint8Array {
  if (entry.data === undefined) return new Uint8Array();
  return typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
}

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

/** RAR5 变长整数：每字节 7 位，小端，高位表示后面还有字节。 */
function vint(value: number): number[] {
  const out: number[] = [];
  let rest = BigInt(value);
  do {
    let byte = Number(rest & 0x7fn);
    rest >>= 7n;
    if (rest > 0n) byte |= 0x80;
    out.push(byte);
  } while (rest > 0n);
  return out;
}

function concat(parts: ArrayLike<number>[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** RAR5 块：CRC32 覆盖「头大小」字段到头结束；数据区跟在头后面，不计入 CRC。 */
function rar5Block(fields: number[], data?: Uint8Array): Uint8Array {
  const size = vint(fields.length);
  return concat([u32(crc32([...size, ...fields])), size, fields, data ?? []]);
}

export function buildRar5(entries: RarFixtureEntry[], options: RarFixtureOptions = {}): Uint8Array {
  const parts: ArrayLike<number>[] = [[0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]];
  // 主头：类型 1，归档标志 0x0001 = 分卷
  parts.push(rar5Block([...vint(1), ...vint(0), ...vint(options.volume ? 0x0001 : 0)]));
  for (const entry of entries) {
    const isDirectory = entry.data === undefined;
    const data = entryBytes(entry);
    const name = encoder.encode(entry.name);
    const fields = [
      ...vint(2), // 文件头
      ...vint(isDirectory ? 0 : 0x0002), // 头标志：有数据区
      ...(isDirectory ? [] : vint(data.length)), // 数据区大小（存储 = 原始大小）
      ...vint(isDirectory ? 0x0001 : 0x0004), // 文件标志：目录 / 带 CRC32
      ...vint(entry.declaredSize ?? data.length),
      ...vint(isDirectory ? 0x10 : 0x20), // Windows 属性：目录 / 归档
      ...(isDirectory ? [] : u32(crc32(data))),
      ...vint(0), // 压缩信息：算法 0、存储
      ...vint(0), // 宿主系统：Windows
      ...vint(name.length),
      ...name,
    ];
    parts.push(rar5Block(fields, isDirectory ? undefined : data));
  }
  parts.push(rar5Block([...vint(5), ...vint(0), ...vint(0)]));
  return concat(parts);
}

/** RAR4 块：HEAD_CRC 取 CRC32 低 16 位，覆盖 HEAD_TYPE 到头结束。 */
function rar4Block(type: number, flags: number, body: number[], data?: Uint8Array): Uint8Array {
  const header = [type, ...u16(flags), ...u16(7 + body.length), ...body];
  return concat([u16(crc32(header) & 0xffff), header, data ?? []]);
}

/** DOS 时间：2026-09-18 12:00:00 */
const DOS_TIME = ((2026 - 1980) << 25) | (9 << 21) | (18 << 16) | (12 << 11);

export function buildRar4(entries: RarFixtureEntry[], options: RarFixtureOptions = {}): Uint8Array {
  const parts: ArrayLike<number>[] = [[0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]];
  // MAIN_HEAD：0x0001 = 分卷，0x0100 = 第一卷
  parts.push(rar4Block(0x73, options.volume ? 0x0101 : 0, [...u16(0), ...u32(0)]));
  for (const entry of entries) {
    const isDirectory = entry.data === undefined;
    const data = entryBytes(entry);
    const name = encoder.encode(entry.name);
    // 0x8000 LONG_BLOCK（文件头必带）；0x00e0 = 目录；0x0004 = 加密
    const flags = 0x8000 | (isDirectory ? 0x00e0 : 0) | (entry.encrypted ? 0x0004 : 0);
    const body = [
      ...u32(data.length), // PACK_SIZE
      ...u32(entry.declaredSize ?? data.length), // UNP_SIZE
      2, // HOST_OS：Win32
      ...u32(crc32(data)),
      ...u32(DOS_TIME),
      29, // UNP_VER
      0x30, // METHOD：存储
      ...u16(name.length),
      ...u32(isDirectory ? 0x10 : 0x20),
      ...name,
    ];
    parts.push(rar4Block(0x74, flags, body, isDirectory ? undefined : data));
  }
  parts.push(rar4Block(0x7b, 0x4000, []));
  return concat(parts);
}
