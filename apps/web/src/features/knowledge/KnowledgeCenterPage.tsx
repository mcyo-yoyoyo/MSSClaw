import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { KB_COLLECTIONS } from '@/domain/prototype/kb';

import { downloadKbMetadata } from '@/domain/kbUtils';

import type { PrototypeKbDocument } from '@/domain/prototype/types';

import {

  CenterModal,

  CenterPageHeader,

  CenterSearchInput,

  StatCardGrid,

} from '@/components/center/CenterShell';

import { KbDocumentEditorModal } from '@/components/center/KbDocumentEditorModal';
import { DocumentPreviewPanel } from '@/components/center/DocumentPreviewPanel';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';

import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { fetchKbVectorStatus, type KbVectorStatus } from '@/api/kbClient';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';



const TYPE_ICONS: Record<string, [string, string]> = {

  PDF: ['fa-file-pdf', 'text-red-500'],

  XLSX: ['fa-file-excel', 'text-green-600'],

  DOCX: ['fa-file-word', 'text-blue-500'],

  Folder: ['fa-folder', 'text-amber-500'],

  Bundle: ['fa-box-archive', 'text-purple-500'],

  MD: ['fa-file-lines', 'text-[#86868b]'],

};



const UPLOAD_ACCEPT = '.pdf,.docx,.xlsx,.pptx,.md,.txt';



function getCollectionName(id: string): string {

  return KB_COLLECTIONS.find((c) => c.id === id)?.name ?? id;

}



function kbPreview(doc: PrototypeKbDocument): string {

  if (doc.collection === 'service') {

    return '【SOP 摘要】\n1. 客诉分级：P0 2h 响应 / P1 4h\n2. 电池过热：引导关闭高性能模式 → OTA 1.4.2\n3. 升级路径：一线 → 区域主管 → 总部 CSC';

  }

  if (doc.collection === 'channel' || doc.collection === 'finance') {

    return '【政策摘要】\n· Q3 返利系数按 SI 达成率阶梯计算\n· 价保窗口：上市 30 天内 FD 破价自动触发稽核\n· 代表处对账周期：每月 5 日';

  }

  return `【文档摘要】\n${doc.desc}\n\n已向量化 ${doc.chunks} 个语义块，密级 ${doc.clearance}，可供 RAG 检索与引用溯源。`;

}



interface KnowledgeCenterPageProps {

  onAskDocument: (doc: PrototypeKbDocument) => void;

}



export function KnowledgeCenterPage({ onAskDocument }: KnowledgeCenterPageProps) {

  const {

    kbDocs,

    kbFilter,

    kbSearch,

    setKbFilter,

    setKbSearch,

    kbDeptFilter,

    kbRegionFilter,

    kbEfficiencyFilter,

    setKbDeptFilter,

    setKbRegionFilter,

    setKbEfficiencyFilter,

    filteredKbDocs,

    uploadKbFile,

    syncKbIndex,

    showToast,

  } = useMarketplaceStore();

  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [vectorStatus, setVectorStatus] = useState<KbVectorStatus | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchKbVectorStatus(workspaceId, kbDocs).then(setVectorStatus);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [workspaceId, kbDocs]);

  const uploadRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<PrototypeKbDocument | null>(null);

  const [editorTarget, setEditorTarget] = useState<string | null>(null);

  const consumeKbDocId = useNavigationIntentStore((s) => s.consumeKbDocId);
  const pendingKbDocId = useNavigationIntentStore((s) => s.pendingKbDocId);

  const docs = filteredKbDocs();

  useEffect(() => {
    if (!pendingKbDocId) return;
    const id = consumeKbDocId();
    if (!id) return;
    const found = kbDocs.find((d) => d.id === id);
    if (!found) {
      showToast(`未找到知识文档：${id}`);
      return;
    }
    setKbSearch('');
    setKbFilter(found.collection);
    setPreview(found);
  }, [pendingKbDocId, kbDocs, consumeKbDocId, setKbFilter, setKbSearch, showToast]);



  const stats = useMemo(() => {

    const totalChunks = kbDocs.reduce((n, d) => n + d.chunks, 0);

    return [

      ['文档总数', kbDocs.length],

      ['已索引', kbDocs.filter((d) => d.indexed).length],

      ['业务部门', KB_COLLECTIONS.length - 1],

      ['向量块', totalChunks.toLocaleString()],

    ] as [string, string | number][];

  }, [kbDocs]);



  const indexLabel = useMemo(() => {

    const totalChunks = kbDocs.reduce((n, d) => n + d.chunks, 0);

    return `${kbDocs.length} 篇 · ${totalChunks.toLocaleString()} chunks`;

  }, [kbDocs]);



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const docId = await uploadKbFile(file);
    if (!docId) return;
    const doc = useMarketplaceStore.getState().kbDocs.find((d) => d.id === docId);
    useAssetApprovalStore.getState().openApproval({
      kind: 'kb',
      assetId: docId,
      assetName: doc?.title || file.name,
    });
  };



  return (

    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">

      <input

        ref={uploadRef}

        type="file"

        accept={UPLOAD_ACCEPT}

        className="hidden"

        onChange={handleFileChange}

      />



      <div className="mx-auto max-w-6xl">

        <CenterPageHeader

          title="知识库"

          subtitle="企业文档 · RAG 检索 · 引用溯源"

          tip={
            <>
              上传文档后 Agent 可在任务中心基于 RAG 检索并引用溯源。向量索引状态显示在页头，支持 Milvus 语义检索。
            </>
          }

          actions={

            <>

              <span className="self-center text-[11px] text-[#86868b]">{indexLabel}</span>

              {vectorStatus && (
                <span
                  className={cn(
                    'self-center rounded-full px-2.5 py-1 text-[10px] font-semibold',
                    vectorStatus.mode === 'vector'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border border-black/8 bg-black/[0.03] text-[#86868b]',
                  )}
                  title={`检索引擎：${vectorStatus.engine}`}
                >
                  <i className="fa-solid fa-database mr-1 text-[9px]" />
                  {vectorStatus.engine}
                  {vectorStatus.indexedChunks != null ? ` · ${vectorStatus.indexedChunks} chunks` : ''}
                </span>
              )}

              <CenterSearchInput value={kbSearch} onChange={setKbSearch} placeholder="搜索文档…" className="w-56" />

              <button

                type="button"

                onClick={() => syncKbIndex()}

                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-semibold transition hover:border-zinc-900"

              >

                <i className="fa-solid fa-rotate mr-1" />

                同步索引

              </button>

              <button

                type="button"

                onClick={() => uploadRef.current?.click()}

                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition"

              >

                <i className="fa-solid fa-upload mr-1" />

                上传文档

              </button>

            </>

          }

        />



        <StatCardGrid items={stats} />

        <OrgAssetFilterBar
          deptFilter={kbDeptFilter}
          regionFilter={kbRegionFilter}
          efficiencyFilter={kbEfficiencyFilter === 'experience' ? 'all' : kbEfficiencyFilter}
          onDeptChange={setKbDeptFilter}
          onRegionChange={setKbRegionFilter}
          onEfficiencyChange={(id) => setKbEfficiencyFilter(id)}
        />

        <div className="flex flex-col gap-4 lg:flex-row">

          <aside className="w-full shrink-0 lg:w-52">

            <div className="space-y-1">

              {KB_COLLECTIONS.map((c) => (

                <button

                  key={c.id}

                  type="button"

                  onClick={() => setKbFilter(c.id)}

                  className={cn(

                    'kb-collection-btn w-full rounded-xl border border-transparent px-3 py-2.5 text-left text-[12px] transition',

                    kbFilter === c.id ? 'active font-semibold' : 'hover:bg-black/[0.03]',

                  )}

                >

                  <i className={cn('fa-solid mr-2 w-4', c.icon)} />

                  {c.name}

                  {c.id !== 'all' && c.desc && (

                    <p className="ml-6 mt-0.5 text-[10px] font-normal text-[#86868b]">{c.desc}</p>

                  )}

                </button>

              ))}

            </div>

          </aside>



          <div className="min-w-0 flex-1 space-y-3">

            {docs.length ? (

              docs.map((d) => {

                const [ic, icColor] = TYPE_ICONS[d.type] ?? ['fa-file-lines', 'text-[#86868b]'];

                return (

                  <div

                    key={d.id}

                    className="apple-card flex flex-col gap-4 p-4 md:flex-row md:items-center"

                  >

                    <div className="flex min-w-0 flex-1 items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-claw-50">

                        <i className={cn('fa-solid', ic, icColor)} />

                      </div>

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="text-[13px] font-semibold text-[#1d1d1f]">{d.title}</h3>

                          <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[9px] text-[#86868b]">

                            {getCollectionName(d.collection)}

                          </span>

                          {d.indexed ? (

                            <span className="rounded-full bg-claw-50 px-1.5 py-0.5 text-[9px] text-zinc-700">

                              已索引

                            </span>

                          ) : (

                            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] text-zinc-700">

                              待索引

                            </span>

                          )}

                        </div>

                        <p className="mt-0.5 line-clamp-1 text-[12px] text-[#86868b]">{d.desc}</p>

                        <p className="mt-1 text-[10px] text-[#86868b]">

                          {d.type} · {d.size} · {d.clearance} · {d.updatedAt} · {d.chunks} chunks

                        </p>

                      </div>

                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">

                      <button

                        type="button"

                        onClick={() => setPreview(d)}

                        className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium transition hover:border-zinc-900"

                      >

                        在线预览

                      </button>

                      <button

                        type="button"

                        onClick={() => setEditorTarget(d.id)}

                        className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium transition hover:border-zinc-900"

                      >

                        编辑

                      </button>

                      <button

                        type="button"

                        onClick={() => onAskDocument(d)}

                        className="apple-btn-primary rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white"

                      >

                        向 Agent 提问

                      </button>

                      <button

                        type="button"

                        onClick={() => {

                          downloadKbMetadata(d);

                          showToast(`已下载元数据：${d.title}`);

                        }}

                        className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium"

                        title="导出元数据"

                      >

                        <i className="fa-solid fa-download" />

                      </button>

                    </div>

                  </div>

                );

              })

            ) : (

              <div className="apple-card p-8 text-center text-[#86868b]">未找到匹配的文档</div>

            )}

          </div>

        </div>

      </div>



      <CenterModal

        open={!!preview}

        title={preview?.title ?? ''}

        onClose={() => setPreview(null)}

        actions={

          preview && (

            <>

              <button

                type="button"

                onClick={() => {

                  onAskDocument(preview);

                  setPreview(null);

                }}

                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"

              >

                向知识 Agent 提问

              </button>

              <button

                type="button"

                onClick={() => setPreview(null)}

                className="rounded-xl border border-black/8 px-4 py-2 text-[12px]"

              >

                关闭

              </button>

            </>

          )

        }

      >

        {preview && (
          <DocumentPreviewPanel
            meta={{
              title: preview.title,
              typeLabel: preview.type,
              author: preview.author,
              updatedAt: preview.updatedAt,
              size: preview.size,
              pages: preview.pages || Math.max(2, Math.ceil(preview.chunks / 80)),
              summary: kbPreview(preview),
            }}
          />
        )}

      </CenterModal>



      <KbDocumentEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />

    </div>

  );

}


