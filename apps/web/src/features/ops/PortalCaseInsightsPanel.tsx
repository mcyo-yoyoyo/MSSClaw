import { useEffect, useMemo, useRef, useState } from 'react';
import { strFromU8, unzipSync } from 'fflate';
import {
  changeCaseInsightStatus,
  createCaseInsight,
  deleteCaseInsight,
  fetchCaseInsightsForOps,
  restoreCaseInsight,
  updateCaseInsight,
  type CaseInsightArticle,
  type CaseInsightDraft,
} from '@/api/caseInsightsApi';
import { CaseHtml } from '@/features/ai-brief/CaseHtml';
import { CaseMarkdown } from '@/features/ai-brief/CaseMarkdown';
import { emptyCaseDraft, parseCaseHtml, type ParsedCaseHtmlArticle } from '@/domain/caseInsightImport';
import { HQ_DEPTS } from '@/domain/orgTaxonomy';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type StatusTab = 'all' | 'draft' | 'published' | 'archived' | 'trash';
type StagedCase = {
  key: string;
  fileName: string;
  draft: CaseInsightDraft;
  existing: CaseInsightArticle | null;
  saved: boolean;
};

const STATUS_LABEL: Record<string, string> = { draft: '草稿', published: '已发布', archived: '已下架' };
const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'draft', label: '草稿' },
  { id: 'published', label: '已发布' },
  { id: 'archived', label: '已下架' },
  { id: 'trash', label: '回收站' },
];

function articleDraft(item: CaseInsightArticle): CaseInsightDraft {
  return {
    sourceCaseId: item.sourceCaseId ?? null,
    title: item.title,
    summary: item.summary,
    company: item.company,
    sourceUrl: item.sourceUrl,
    domainIds: item.domainIds,
    tags: item.tags,
    html: item.html ?? '',
    coverImage: item.coverImage ?? null,
    sortOrder: item.sortOrder ?? 0,
    version: item.version,
  };
}

function normalizedTitle(title: string) {
  return title.trim().toLocaleLowerCase();
}

function validOptionalSourceUrl(value: string) {
  const source = value.trim();
  if (!source) return true;
  try {
    const url = new URL(source);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function PortalCaseInsightsPanel() {
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const [items, setItems] = useState<CaseInsightArticle[]>([]);
  const [trashItems, setTrashItems] = useState<CaseInsightArticle[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [coverError, setCoverError] = useState('');
  const [queue, setQueue] = useState<StagedCase[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [draft, setDraft] = useState<CaseInsightDraft>(emptyCaseDraft);
  const singleRef = useRef<HTMLInputElement>(null);
  const packageRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const current = queue[queueIndex];
  const sourceUrlInvalid = !validOptionalSourceUrl(draft.sourceUrl);
  const htmlCover = useMemo(() => {
    const document = new DOMParser().parseFromString(draft.html ?? '', 'text/html');
    const source = document.querySelector<HTMLImageElement>('.reader-cover img, .detail-cover img')?.getAttribute('src') ?? '';
    return /^data:image\//i.test(source) ? source : null;
  }, [draft.html]);
  const coverPreview = draft.coverImage || htmlCover;

  const reload = async () => {
    const [active, trash] = await Promise.all([
      fetchCaseInsightsForOps(workspaceId, 'active'),
      fetchCaseInsightsForOps(workspaceId, 'trash'),
    ]);
    setItems(active);
    setTrashItems(trash);
    return { active, trash };
  };

  useEffect(() => {
    setLoading(true);
    void reload().catch(() => setMessage('案例列表加载失败，请检查后台连接')).finally(() => setLoading(false));
  }, [workspaceId]);

  const visibleItems = useMemo(() => {
    const source = statusTab === 'trash' ? trashItems : items.filter((item) => statusTab === 'all' || item.status === statusTab);
    const text = query.trim().toLocaleLowerCase();
    return source.filter((item) => {
      if (domainFilter && !item.domainIds.includes(domainFilter)) return false;
      return !text || [item.title, item.company, item.summary, ...item.tags].some((value) => value.toLocaleLowerCase().includes(text));
    }).sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || (right.updatedAt ?? '').localeCompare(left.updatedAt ?? ''));
  }, [domainFilter, items, query, statusTab, trashItems]);

  const openQueue = (staged: StagedCase[]) => {
    if (!staged.length) return;
    setQueue(staged);
    setQueueIndex(0);
    setDraft(staged[0]!.draft);
    setEditorOpen(true);
    setCoverError('');
    setMessage('');
  };

  const allExisting = async () => {
    const [active, trash] = await Promise.all([
      fetchCaseInsightsForOps(workspaceId, 'active'),
      fetchCaseInsightsForOps(workspaceId, 'trash'),
    ]);
    return [...active, ...trash];
  };

  const stageParsed = async (parsed: ParsedCaseHtmlArticle[], sourceName: string, invalid: string[] = []) => {
    const existing = await allExisting();
    const bySource = new Map(existing.filter((item) => item.sourceCaseId).map((item) => [item.sourceCaseId!, item]));
    const byTitle = new Map(existing.map((item) => [normalizedTitle(item.title), item]));
    const staged: StagedCase[] = [];
    const seenSources = new Set<string>();
    const seenTitles = new Set<string>();
    let repeatedInFile = 0;
    for (const article of parsed) {
      const source = article.sourceCaseId;
      const titleKey = normalizedTitle(article.draft.title);
      if ((source && seenSources.has(source)) || seenTitles.has(titleKey)) { repeatedInFile += 1; continue; }
      if (source) seenSources.add(source);
      seenTitles.add(titleKey);
      const prior = (source ? bySource.get(source) : undefined) ?? byTitle.get(titleKey) ?? null;
      const draft = prior
        ? { ...article.draft, sourceCaseId: prior.sourceCaseId ?? article.sourceCaseId, sourceUrl: article.draft.sourceUrl || prior.sourceUrl, coverImage: prior.coverImage ?? null, sortOrder: prior.sortOrder ?? staged.length * 10, version: prior.version }
        : { ...article.draft, sortOrder: staged.length * 10 };
      staged.push({ key: `${source ?? titleKey}-${staged.length}`, fileName: article.fileName || sourceName, draft, existing: prior, saved: false });
    }
    if (!staged.length) {
      setMessage(invalid.length ? `没有可预览的 HTML 文章：${invalid.join('；')}` : '素材包中没有可导入的 HTML 文章');
      return;
    }
    openQueue(staged);
    const updates = staged.filter((item) => item.existing).length;
    const notes = [
      `已解析 ${staged.length} 篇，尚未保存`,
      updates ? `其中 ${updates} 篇匹配已有文章` : '',
      repeatedInFile ? `包内重复 ${repeatedInFile} 篇已跳过` : '',
      invalid.length ? `未解析 ${invalid.length} 个文件` : '',
    ].filter(Boolean);
    setMessage(notes.join('；'));
  };

  const importSingle = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { setMessage('单篇 HTML 超过 2 MB，请通过素材包整理图片后再导入'); return; }
    setBusy(true);
    try {
      const parsed = parseCaseHtml(await file.text(), file.name);
      if (!parsed) { setMessage('无法解析该 HTML，请确认文件含有标题和文章正文'); return; }
      await stageParsed([parsed], file.name);
    } finally { setBusy(false); }
  };

  const importPackage = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) { setMessage('素材包超过 20 MB，无法导入'); return; }
    setBusy(true);
    setMessage('正在解析 HTML 素材包…');
    try {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
      const htmlFiles = Object.entries(entries)
        .filter(([name, bytes]) => !name.endsWith('/') && /\.html?$/i.test(name) && bytes.length > 0)
        .sort(([left], [right]) => left.localeCompare(right));
      if (!htmlFiles.length || htmlFiles.length > 40) {
        setMessage(htmlFiles.length ? '一个素材包最多导入 40 篇文章' : '素材包中没有 HTML 文件');
        return;
      }
      const parsed: ParsedCaseHtmlArticle[] = [];
      const invalid: string[] = [];
      let totalBytes = 0;
      for (const [name, bytes] of htmlFiles) {
        totalBytes += bytes.length;
        if (bytes.length > 1_000_000 || totalBytes > 10 * 1024 * 1024) { invalid.push(`${name}（超过内容限制）`); continue; }
        const article = parseCaseHtml(strFromU8(bytes), name);
        if (article) parsed.push(article);
        else invalid.push(`${name}（缺少标题、正文或自包含图片）`);
      }
      await stageParsed(parsed, file.name, invalid);
    } catch {
      setMessage('素材包无法读取，请确认 ZIP 内是 UTF-8 编码的 HTML 文章');
    } finally { setBusy(false); }
  };

  const updateDraft = (changes: Partial<CaseInsightDraft>) => {
    const next = { ...draft, ...changes };
    setDraft(next);
    setQueue((items) => items.map((item, index) => index === queueIndex ? { ...item, draft: next, saved: false } : item));
  };

  const selectQueueItem = (index: number) => {
    setQueueIndex(index);
    setDraft(queue[index]!.draft);
    setCoverError('');
  };

  const uploadCover = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCoverError('请选择 JPG、PNG 或 WebP 图片。');
      return;
    }
    if (file.size > 1024 * 1024) {
      setCoverError('图片不能超过 1 MB。');
      return;
    }
    setBusy(true);
    setCoverError('');
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('cover_read_failed'));
        reader.onerror = () => reject(new Error('cover_read_failed'));
        reader.readAsDataURL(file);
      });
      updateDraft({ coverImage: image });
    } catch {
      setCoverError('封面读取失败，请重新选择图片。');
    } finally {
      setBusy(false);
    }
  };

  const persistItem = async (item: StagedCase, action: 'draft' | 'publish'): Promise<StagedCase> => {
    if (!item.draft.title.trim() || !item.draft.html?.trim()) throw new Error('标题与 HTML 正文不能为空');
    if (!validOptionalSourceUrl(item.draft.sourceUrl)) throw new Error('原始链接需为 http(s) 地址');
    let existing = item.existing;
    let version = item.draft.version;
    if (existing?.deletedAt) {
      const restored = await restoreCaseInsight(workspaceId, existing.id, existing.version ?? 0);
      version = restored.version;
      existing = { ...existing, deletedAt: null, status: restored.status as CaseInsightArticle['status'], version: restored.version };
    }
    const payload: CaseInsightDraft = { ...item.draft, version };
    const saved = existing
      ? await updateCaseInsight(workspaceId, existing.id, payload)
      : await createCaseInsight(workspaceId, payload);
    let nextVersion = saved.version;
    if (action === 'publish') {
      const result = await changeCaseInsightStatus(workspaceId, saved.id, saved.version, 'publish');
      nextVersion = result.version;
    }
    const [active, trash] = await Promise.all([
      fetchCaseInsightsForOps(workspaceId, 'active'),
      fetchCaseInsightsForOps(workspaceId, 'trash'),
    ]);
    setItems(active);
    setTrashItems(trash);
    const updated = active.find((row) => row.id === saved.id) ?? null;
    return {
      ...item,
      draft: { ...payload, version: nextVersion },
      existing: updated,
      saved: true,
    };
  };

  const saveCurrent = async (action: 'draft' | 'publish') => {
    if (!current) return;
    setBusy(true);
    setMessage('');
    try {
      const updated = await persistItem(current, action);
      const next = queue.map((item, index) => index === queueIndex ? updated : item);
      setQueue(next);
      setDraft(updated.draft);
      setMessage(action === 'publish'
        ? '已发布，用户现在可以在 AI 快讯阅读'
        : updated.existing?.status === 'published'
          ? '运营信息和正文已保存；线上版本未改变，点击“直接发布”后更新'
          : '已保存为草稿');
    } catch (error) {
      setMessage(String(error).includes('409') ? '保存冲突：文章已被其他运营修改，请返回列表后重新打开' : `保存失败：${String(error).replace(/^Error: /, '')}`);
    } finally { setBusy(false); }
  };

  const saveAllDrafts = async () => {
    setBusy(true);
    setMessage('');
    let next = [...queue];
    let savedCount = 0;
    const failures: string[] = [];
    for (let index = 0; index < next.length; index += 1) {
      const item = next[index]!;
      if (item.saved) continue;
      try {
        next[index] = await persistItem(item, 'draft');
        savedCount += 1;
        setQueue([...next]);
      } catch {
        failures.push(item.draft.title || item.fileName);
      }
    }
    setQueue(next);
    setDraft(next[queueIndex]?.draft ?? draft);
    setBusy(false);
    setMessage(failures.length ? `已保存 ${savedCount} 篇；失败 ${failures.length} 篇：${failures.join('、')}` : `已保存 ${savedCount} 篇草稿`);
  };

  const changeStatus = async (item: CaseInsightArticle, action: 'publish' | 'unpublish') => {
    if (!item.version) return;
    setBusy(true);
    setMessage('');
    try {
      await changeCaseInsightStatus(workspaceId, item.id, item.version, action);
      await reload();
      setMessage(action === 'publish' ? '已发布' : '已下架，用户侧不再展示');
    } catch (error) {
      setMessage(String(error).includes('409') ? '文章已被其他运营修改，请刷新后重试' : action === 'publish' ? '发布失败：请确认已保存文章标题和 HTML 正文' : '下架失败，请稍后重试');
    } finally { setBusy(false); }
  };

  const moveToTrash = async (item: CaseInsightArticle) => {
    if (!item.version) return;
    setBusy(true);
    try {
      await deleteCaseInsight(workspaceId, item.id, item.version);
      setConfirmDeleteId(null);
      await reload();
      setMessage('已移入回收站；已发布文章已从用户侧隐藏');
    } catch { setMessage('移入回收站失败，请刷新后重试'); }
    finally { setBusy(false); }
  };

  const restoreFromTrash = async (item: CaseInsightArticle) => {
    if (!item.version) return;
    setBusy(true);
    try {
      await restoreCaseInsight(workspaceId, item.id, item.version);
      await reload();
      setMessage('文章已恢复；如需重新展示，请再发布一次');
    } catch { setMessage('恢复失败，请刷新后重试'); }
    finally { setBusy(false); }
  };

  const leaveEditor = () => {
    const dirty = queue.some((item) => !item.saved);
    if (dirty && !window.confirm('有文章尚未保存，返回列表会放弃这些修改。继续？')) return;
    setEditorOpen(false);
    setQueue([]);
    setQueueIndex(0);
    setDraft(emptyCaseDraft());
    setCoverError('');
    setMessage('');
  };

  const downloadHtml = (source: CaseInsightDraft = draft) => {
    if (!source.html) return;
    const blob = new Blob([source.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(source.title || '案例洞察').replace(/[\\/:*?"<>|]/g, '_')}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const stageExisting = (item: CaseInsightArticle) => {
    const staged: StagedCase = { key: item.id, fileName: item.title, draft: articleDraft(item), existing: item, saved: false };
    openQueue([staged]);
  };

  const sortedTabs = STATUS_TABS;

  return (
    <div className="space-y-4 pb-8">
      {message ? <p role="status" className="border-l-2 border-blue-500 pl-3 text-xs text-zinc-700">{message}</p> : null}
      {!editorOpen ? <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">案例洞察</h3>
            <p className="mt-1 text-xs text-zinc-500">管理文章内容、上架状态与展示顺序</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => singleRef.current?.click()} className="apple-btn-secondary px-3 py-2 text-xs disabled:opacity-50">导入单篇 HTML</button>
            <button type="button" disabled={busy} onClick={() => packageRef.current?.click()} className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">导入多篇素材包</button>
            <input ref={singleRef} type="file" accept=".html,.htm,text/html" className="hidden" onChange={(event) => {
              const file = event.target.files?.[0]; event.target.value = '';
              if (file) void importSingle(file).catch(() => setMessage('HTML 文件读取失败'));
            }} />
            <input ref={packageRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(event) => {
              const file = event.target.files?.[0]; event.target.value = '';
              if (file) void importPackage(file);
            }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-2">
          <div className="flex flex-wrap gap-4" role="tablist" aria-label="案例状态">
            {sortedTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={statusTab === tab.id} onClick={() => { setStatusTab(tab.id); setConfirmDeleteId(null); }} className={`border-b-2 px-1 pb-2 text-xs ${statusTab === tab.id ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}>{tab.label}</button>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索案例" aria-label="搜索案例" className="h-9 w-48 rounded border border-zinc-200 px-3 text-xs outline-none focus:border-blue-500" />
            <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)} aria-label="按领域筛选" className="h-9 rounded border border-zinc-200 bg-white px-2 text-xs">
              <option value="">全部领域</option>
              {HQ_DEPTS.map((dept) => <option key={dept.id} value={dept.id}>{dept.label}</option>)}
            </select>
          </div>
        </div>

        <div className="text-xs text-zinc-500">{loading ? '正在加载…' : `${visibleItems.length} 篇文章`}</div>
        <div className="border-t border-zinc-200">
          {visibleItems.map((item) => <div key={item.id} className="border-b border-zinc-200 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="max-w-3xl truncate text-sm font-medium text-zinc-900">{item.title}</h4>
                  <span className={`rounded px-2 py-0.5 text-[11px] ${item.deletedAt ? 'bg-zinc-100 text-zinc-600' : item.status === 'published' ? 'bg-green-50 text-green-700' : item.status === 'archived' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{item.deletedAt ? '回收站' : STATUS_LABEL[item.status ?? 'draft']}</span>
                  {item.legacyMarkdown && !item.html ? <span className="text-[11px] text-amber-700">旧版正文，需导入 HTML 更新</span> : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span>{item.company || '未标注企业'}</span>
                  <span>顺序 {item.sortOrder ?? 0}</span>
                  <span>{item.updatedAt?.slice(0, 10) ?? ''}</span>
                  {item.domainIds.map((id) => <span key={id} className="text-blue-700">{HQ_DEPTS.find((dept) => dept.id === id)?.label ?? id}</span>)}
                  {item.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                {item.summary ? <p className="mt-1 line-clamp-1 max-w-4xl text-xs text-zinc-500">{item.summary}</p> : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {item.deletedAt ? <button type="button" disabled={busy} onClick={() => void restoreFromTrash(item)} className="apple-btn-secondary px-2.5 py-1.5 text-xs">恢复</button> : <>
                  <button type="button" disabled={busy} onClick={() => stageExisting(item)} className="apple-btn-secondary px-2.5 py-1.5 text-xs">预览与编辑</button>
                  {item.status === 'published'
                    ? <button type="button" disabled={busy} onClick={() => void changeStatus(item, 'unpublish')} className="apple-btn-secondary px-2.5 py-1.5 text-xs">下架</button>
                    : <button type="button" disabled={busy || !item.html} onClick={() => void changeStatus(item, 'publish')} className="apple-btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40">发布</button>}
                  {item.html ? <button type="button" onClick={() => downloadHtml(articleDraft(item))} className="px-2 py-1.5 text-xs text-zinc-600 hover:text-blue-700">下载 HTML</button> : null}
                  {confirmDeleteId === item.id ? <>
                    <span className="text-xs text-zinc-600">移入回收站？{item.status === 'published' ? '将立即下架。' : ''}</span>
                    <button type="button" disabled={busy} onClick={() => void moveToTrash(item)} className="rounded bg-red-600 px-2.5 py-1.5 text-xs text-white disabled:opacity-50">确认</button>
                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="px-2 py-1.5 text-xs text-zinc-600">取消</button>
                  </> : <button type="button" onClick={() => setConfirmDeleteId(item.id)} className="px-2 py-1.5 text-xs text-zinc-500 hover:text-red-700">删除</button>}
                </>}
              </div>
            </div>
          </div>)}
          {!loading && visibleItems.length === 0 ? <p className="py-14 text-center text-sm text-zinc-500">{statusTab === 'trash' ? '回收站为空' : '还没有案例洞察，导入 HTML 开始运营。'}</p> : null}
        </div>
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
          <div>
            <button type="button" disabled={busy} onClick={leaveEditor} className="mb-2 text-xs text-blue-700 hover:underline disabled:opacity-50">← 返回列表</button>
            <h3 className="text-base font-semibold text-zinc-900">{queue.length > 1 ? `导入审阅 · ${queue.length} 篇` : current?.existing ? '文章运营' : '导入审阅'}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {draft.html ? <button type="button" onClick={() => downloadHtml()} className="apple-btn-secondary px-3 py-2 text-xs">下载 HTML</button> : null}
            {queue.length > 1 ? <button type="button" disabled={busy} onClick={() => void saveAllDrafts()} className="apple-btn-secondary px-3 py-2 text-xs disabled:opacity-50">全部存为草稿</button> : null}
            <button type="button" disabled={busy || !draft.title.trim() || !draft.html?.trim() || sourceUrlInvalid} onClick={() => void saveCurrent('draft')} className="apple-btn-secondary px-3 py-2 text-xs disabled:opacity-50">保存草稿</button>
            <button type="button" disabled={busy || !draft.title.trim() || !draft.html?.trim() || sourceUrlInvalid} onClick={() => void saveCurrent('publish')} className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{current?.existing?.status === 'published' ? '发布更新' : '直接发布'}</button>
          </div>
        </div>

        {queue.length > 1 ? <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 pb-3">
          {queue.map((item, index) => <button key={item.key} type="button" disabled={busy} onClick={() => selectQueueItem(index)} className={`min-w-48 max-w-72 border-b-2 px-2 py-2 text-left disabled:opacity-50 ${queueIndex === index ? 'border-blue-600' : 'border-transparent'}`}>
            <span className="block truncate text-xs font-medium text-zinc-800">{item.draft.title}</span>
            <span className="mt-1 block text-[11px] text-zinc-500">{item.saved ? item.existing?.status === 'published' ? '已发布 · 有未发布修改' : '已保存' : item.existing ? `匹配已有 · ${STATUS_LABEL[item.existing.status ?? 'draft']}` : '待保存'}</span>
          </button>)}
        </div> : null}

        {current ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 overflow-hidden border border-zinc-200 bg-white">
            {draft.html ? <CaseHtml html={draft.html} title={`${draft.title} 预览`} /> : current.existing?.legacyMarkdown ? <div className="p-5"><p className="mb-3 text-xs text-amber-700">此文章尚未升级为 HTML。导入对应素材包可替换为原始排版。</p><CaseMarkdown markdown={current.existing.legacyMarkdown} /></div> : <div className="grid min-h-96 place-items-center text-sm text-zinc-500">无法预览文章内容</div>}
          </div>
          <aside className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700">文章标题</label>
              <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <label className="block text-xs font-medium text-zinc-700">列表摘要 <span className="font-normal text-zinc-400">可选</span>
              <textarea value={draft.summary} onChange={(event) => updateDraft({ summary: event.target.value })} maxLength={600} rows={4} className="mt-1 block w-full resize-y rounded border border-zinc-200 px-3 py-2 text-sm font-normal leading-relaxed text-zinc-800 outline-none focus:border-blue-500" />
            </label>
            <div>
              <p className="text-xs font-medium text-zinc-700">列表封面 <span className="font-normal text-zinc-400">可选</span></p>
              <div className="mt-2 grid aspect-[4/3] w-full place-items-center overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                {coverPreview ? <img src={coverPreview} alt="列表封面预览" className="h-full w-full object-cover" /> : <i className="fa-regular fa-image text-2xl text-zinc-300" aria-hidden="true" />}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" disabled={busy} onClick={() => coverRef.current?.click()} className="apple-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"><i className="fa-solid fa-image mr-1" aria-hidden="true" />{draft.coverImage ? '替换封面' : '上传封面'}</button>
                {draft.coverImage ? <button type="button" disabled={busy} onClick={() => { updateDraft({ coverImage: null }); setCoverError(''); }} className="px-2 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 disabled:opacity-50"><i className="fa-solid fa-trash-can mr-1" aria-hidden="true" />清除自定义封面</button> : null}
                <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0]; event.target.value = '';
                  if (file) void uploadCover(file);
                }} />
              </div>
              {coverError ? <p role="alert" className="mt-1 text-xs text-red-600">{coverError}</p> : null}
            </div>
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-zinc-700">领域</legend>
              <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                {HQ_DEPTS.map((dept) => <label key={dept.id} className="flex items-center gap-2 text-xs text-zinc-700"><input type="checkbox" checked={draft.domainIds.includes(dept.id)} onChange={(event) => updateDraft({ domainIds: event.target.checked ? [...draft.domainIds, dept.id] : draft.domainIds.filter((id) => id !== dept.id) })} />{dept.label}</label>)}
              </div>
            </fieldset>
            <label className="block text-xs font-medium text-zinc-700">标签
              <input value={draft.tags.join('，')} onChange={(event) => updateDraft({ tags: event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) })} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500" placeholder="输入标签，用逗号分隔" />
            </label>
            <label className="block text-xs font-medium text-zinc-700">展示顺序
              <input type="number" value={draft.sortOrder} onChange={(event) => updateDraft({ sortOrder: Number(event.target.value) || 0 })} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500" />
            </label>
            <div className="border-t border-zinc-200 pt-3 text-xs text-zinc-500">
              <p>{draft.company || '未标注企业'}</p>
              <label className="mt-3 block text-xs font-medium text-zinc-700" htmlFor="case-insight-source-url">原始链接 <span className="font-normal text-zinc-400">可选</span></label>
              <input id="case-insight-source-url" type="url" value={draft.sourceUrl} onChange={(event) => updateDraft({ sourceUrl: event.target.value })} placeholder="https://" aria-invalid={sourceUrlInvalid} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-xs text-zinc-800 outline-none focus:border-blue-500" />
              {sourceUrlInvalid ? <p className="mt-1 text-red-600">请输入有效的 http(s) 链接，或留空。</p> : draft.sourceUrl.trim() ? <a href={draft.sourceUrl.trim()} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-blue-700 hover:underline">查看原始来源</a> : <p className="mt-2 text-zinc-400">HTML 未提供原始链接，可手动填写或留空发布。</p>}
            </div>
            {current.existing?.status === 'published' ? <p className="border-l-2 border-amber-500 pl-2 text-xs text-amber-800">保存只更新运营草稿，当前线上版本不变；点击“发布更新”后替换。</p> : null}
          </aside>
        </div> : null}
      </>}
    </div>
  );
}
