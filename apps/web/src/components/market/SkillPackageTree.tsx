import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  buildSkillPackageTree,
  firstPreviewableFile,
  formatBytes,
  type SkillPackageDir,
  type SkillPackageFile,
} from '@/domain/skillPackageTree';

interface PackageSource {
  url: string;
  name: string;
  size: number;
}

/** 目录节点：默认展开顶层，深层收起，避免大包一进来就刷屏 */
function DirNode({
  dir,
  depth,
  selectedPath,
  onSelect,
}: {
  dir: SkillPackageDir;
  depth: number;
  selectedPath: string | null;
  onSelect: (file: SkillPackageFile) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const indent = { paddingLeft: `${depth * 12 + 8}px` };

  return (
    <div>
      {dir.name ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={indent}
          className="flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[11px] font-medium text-zinc-700 transition hover:bg-white"
        >
          <i
            className={cn(
              'fa-solid text-[8px] text-zinc-400 transition-transform',
              open ? 'fa-chevron-down' : 'fa-chevron-right',
            )}
          />
          <i className={cn('fa-solid text-[11px] text-amber-500', open ? 'fa-folder-open' : 'fa-folder')} />
          <span className="min-w-0 truncate">{dir.name}</span>
        </button>
      ) : null}

      {open || !dir.name ? (
        <>
          {dir.dirs.map((sub) => (
            <DirNode
              key={sub.path}
              dir={sub}
              depth={dir.name ? depth + 1 : depth}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
          {dir.files.map((file) => {
            const active = selectedPath === file.path;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => onSelect(file)}
                style={{ paddingLeft: `${(dir.name ? depth + 1 : depth) * 12 + 8}px` }}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[11px] transition',
                  active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-white',
                )}
              >
                <i
                  className={cn(
                    'fa-regular text-[10px]',
                    file.isBinary ? 'fa-file' : 'fa-file-lines',
                    active ? 'text-white/70' : 'text-zinc-400',
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className={cn('shrink-0 tabular-nums text-[10px]', active ? 'text-white/50' : 'text-zinc-400')}>
                  {formatBytes(file.size)}
                </span>
              </button>
            );
          })}
        </>
      ) : null}
    </div>
  );
}

/**
 * Skill 压缩包文件树：按需拉取 blob 并在浏览器内解压。
 * 解压放在前端而非上传时入库，是为了不把几十个文件的内容塞进 CenterRecord 那条 JSON。
 */
export function SkillPackageTree({ source }: { source: PackageSource }) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SkillPackageFile | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBytes(null);
    setError(null);
    setSelected(null);
    (async () => {
      try {
        const res = await fetch(source.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = new Uint8Array(await res.arrayBuffer());
        if (!cancelled) setBytes(buf);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '读取失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source.url]);

  const parsed = useMemo(() => {
    if (!bytes) return null;
    try {
      return buildSkillPackageTree(bytes);
    } catch {
      return 'invalid' as const;
    }
  }, [bytes]);

  useEffect(() => {
    if (parsed && parsed !== 'invalid' && !selected) {
      setSelected(firstPreviewableFile(parsed.root));
    }
  }, [parsed, selected]);

  if (error) {
    return (
      <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 px-4 py-8 text-center text-[12px] text-rose-700">
        Skill 包读取失败（{error}）。请确认后端可访问，或在「配置 Skill」中重新上传。
      </div>
    );
  }
  if (!bytes) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-[12px] text-zinc-400">
        <i className="fa-solid fa-spinner fa-spin mr-1.5" />
        正在读取 Skill 包…
      </div>
    );
  }
  if (!parsed || parsed === 'invalid') {
    return (
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-8 text-center text-[12px] text-amber-800">
        无法解压该文件，可能不是有效的 zip 包。可在「配置 Skill」中重新上传。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2">
        <p className="text-[11px] text-zinc-500">
          <i className="fa-solid fa-file-zipper mr-1.5 text-zinc-400" />
          <span className="font-medium text-zinc-700">{source.name}</span>
          <span className="ml-2 tabular-nums text-zinc-400">
            {parsed.fileCount} 个文件 · {formatBytes(source.size)}
          </span>
        </p>
        <a
          href={source.url}
          download={source.name}
          className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          下载原包
        </a>
      </div>
      <div className="grid min-h-[320px] sm:grid-cols-[240px_minmax(0,1fr)]">
        <div className="max-h-[440px] overflow-auto border-b border-zinc-100 bg-zinc-50/70 p-2 sm:border-b-0 sm:border-r">
          <DirNode dir={parsed.root} depth={0} selectedPath={selected?.path ?? null} onSelect={setSelected} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 text-[11px]">
            <span className="min-w-0 truncate font-mono font-semibold text-zinc-700">
              {selected?.path ?? '未选择文件'}
            </span>
            <span className="shrink-0 text-zinc-400">
              {selected ? (selected.isBinary ? '二进制文件' : '在线预览') : ''}
            </span>
          </div>
          {selected?.isBinary ? (
            <div className="px-4 py-10 text-center text-[12px] text-zinc-400">
              该文件为二进制格式，暂不支持在线预览（{formatBytes(selected.size)}）。
              <br />
              可点右上角「下载原包」后在本地查看。
            </div>
          ) : (
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap p-4 font-mono text-[11px] leading-relaxed text-zinc-700">
              {selected?.text ?? '（空文件）'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
