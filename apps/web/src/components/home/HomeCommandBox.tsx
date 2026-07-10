import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { appendAttachmentReference } from '@/lib/attachment';
import { getHomeSuggestion } from '@/domain/prototype/home';
import { useHomeStore, getSlashQuery } from '@/stores/homeStore';
import { useLlmConfigStore } from '@/stores/llmConfigStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { HomeSlashMenu } from '@/components/home/HomeSlashMenu';
import { HomePickerModal } from '@/components/home/HomePickerModal';
import { LlmSettingsModal } from '@/components/home/LlmSettingsModal';

interface HomeCommandBoxProps {
  onSubmit: (text: string) => void;
}

export function HomeCommandBox({ onSubmit }: HomeCommandBoxProps) {
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashMode, setSlashMode] = useState<'/' | '@'>('/');
  const [picker, setPicker] = useState<'agent' | 'skill' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { draftText, setDraftText } = useHomeStore();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const workspaceList = useWorkspaceStore((s) => s.workspaceList);
  const workspace = useMemo(
    () => workspaceList.find((w) => w.id === workspaceId) ?? workspaceList[0] ?? {
      id: workspaceId,
      name: '工作区',
      namespace: 'default',
      description: '',
      memberCount: 0,
    },
    [workspaceId, workspaceList],
  );
  const config = useLlmConfigStore((s) => s.config);
  const saveConfig = useLlmConfigStore((s) => s.saveConfig);
  const modelOptions = useLlmConfigStore((s) => s.modelOptions);
  const settingsOpen = useLlmConfigStore((s) => s.settingsOpen);
  const openSettings = useLlmConfigStore((s) => s.openSettings);
  const closeSettings = useLlmConfigStore((s) => s.closeSettings);
  const status = useMemo(() => useLlmConfigStore.getState().statusLabel(), [config]);

  const notify = (msg: string) => {
    useConversationStore.setState({ pushToast: msg });
  };

  const { listening, toggle: toggleVoice } = useSpeechInput(
    (text) => {
      const prev = useHomeStore.getState().draftText;
      setDraftText(prev.trim() ? `${prev.trim()} ${text}` : text);
      textareaRef.current?.focus();
    },
    notify,
  );

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 280)}px`;
  };

  const handleInput = (value: string, cursor: number) => {
    setDraftText(value);
    const before = value.slice(0, cursor);
    if (before.match(/\/[^\s]*$/)) {
      setSlashMode('/');
      setSlashOpen(true);
    } else if (before.match(/@[^\s]*$/)) {
      setSlashMode('@');
      setSlashOpen(true);
    } else {
      setSlashOpen(false);
    }
  };

  const insertSkill = (command: string) => {
    const val = draftText.replace(/\/[^\s]*$/, '').trimEnd();
    const next = (val ? `${val} ` : '') + command + ' ';
    setDraftText(next);
    setSlashOpen(false);
    textareaRef.current?.focus();
  };

  const insertAgent = (name: string) => {
    const val = draftText.replace(/@[^\s]*$/, '').trimEnd();
    setDraftText((val ? `${val} ` : '') + `@${name} `);
    setSlashOpen(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    const trimmed = draftText.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setDraftText('');
    setSlashOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const applySuggestion = () => {
    const { category } = useHomeStore.getState();
    setDraftText(getHomeSuggestion(category));
    notify('已填入智能建议');
    textareaRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const prev = useHomeStore.getState().draftText;
    setDraftText(appendAttachmentReference(prev, file.name));
    notify(`已添加附件引用：${file.name}`);
    e.target.value = '';
    textareaRef.current?.focus();
  };

  return (
    <>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      <div className="relative w-full">
        <div className="wb-command-box overflow-hidden">
          <textarea
            ref={textareaRef}
            rows={6}
            value={draftText}
            onChange={(e) => {
              handleInput(e.target.value, e.target.selectionStart ?? e.target.value.length);
              autoGrow(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="min-h-[148px] w-full resize-none bg-transparent px-5 pb-1.5 pt-4 text-[14px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none md:text-[15px]"
            placeholder="描述你想完成的事，@ 选 Agent，/ 调 Skill — 智枢帮你搞定"
          />

          {slashOpen && (
            <HomeSlashMenu
              mode={slashMode}
              query={getSlashQuery(draftText, slashMode)}
              onSelectSkill={(skill) => insertSkill(skill.command)}
              onSelectAgent={(agent) => insertAgent(agent.name)}
              onClose={() => setSlashOpen(false)}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/80 bg-zinc-50/80 px-4 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={config.model}
                onChange={(e) => saveConfig({ model: e.target.value })}
                className="max-w-[140px] rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] text-zinc-800"
              >
                {modelOptions().map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={openSettings}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                title="配置模型 API Key"
              >
                <i className="fa-solid fa-key text-[10px] text-zinc-500" />
                <span>API</span>
              </button>
              <button
                type="button"
                onClick={() => setPicker('skill')}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <i className="fa-solid fa-cube mr-1 text-[10px] text-zinc-500" />
                Skill
              </button>
              <button
                type="button"
                onClick={() => setPicker('agent')}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <i className="fa-solid fa-robot mr-1 text-[10px] text-zinc-500" />
                Agent
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                title="添加附件引用"
              >
                <i className="fa-solid fa-paperclip text-[13px]" />
              </button>
              <button
                type="button"
                onClick={applySuggestion}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
                title="智能建议"
              >
                <i className="fa-solid fa-wand-magic-sparkles text-[13px]" />
              </button>
              <button
                type="button"
                onClick={toggleVoice}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition',
                  listening
                    ? 'bg-zinc-100 text-zinc-800 ring-2 ring-zinc-300/60'
                    : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600',
                )}
                title={listening ? '停止语音输入' : '语音输入'}
              >
                <i className="fa-solid fa-microphone text-[13px]" />
              </button>
              <button
                type="button"
                onClick={() => setDraftText(draftText + '@')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
              >
                <i className="fa-solid fa-at text-[13px]" />
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="apple-btn-primary flex h-8 w-8 items-center justify-center rounded-lg text-white"
              >
                <i className="fa-solid fa-arrow-up text-[13px]" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-4 py-1.5 text-[11px] text-zinc-500">
            <span className="flex shrink-0 items-center gap-1.5">
              <i className="fa-solid fa-building text-[10px] text-zinc-400" />
              {workspace.name}
            </span>
            <span className={cn('truncate text-[10px]', status.configured && 'font-medium text-emerald-600/90')}>
              {status.text}
            </span>
          </div>
        </div>
      </div>

      {picker && (
        <HomePickerModal
          type={picker}
          onClose={() => setPicker(null)}
          onPickSkill={(skill) => {
            insertSkill(skill.command);
            setPicker(null);
          }}
          onPickAgent={(agent) => {
            insertAgent(agent.name);
            setPicker(null);
          }}
        />
      )}

      <LlmSettingsModal open={settingsOpen} onClose={closeSettings} />
    </>
  );
}
