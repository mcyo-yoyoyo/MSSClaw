import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { appendAttachmentReference } from '@/lib/attachment';
import { canExecuteChat, READONLY_EXECUTE_HINT } from '@/domain/permissions';
import { getHomeRegionSuggestion, getHomeSuggestion } from '@/domain/prototype/home';
import type { HomeCategory } from '@/domain/prototype/types';
import { getAgentById } from '@/domain/plan';
import { getSlashQuery, useHomeStore } from '@/stores/homeStore';
import { useLlmConfigStore } from '@/stores/llmConfigStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { HomeSlashMenu } from '@/components/home/HomeSlashMenu';
import { HomePickerModal } from '@/components/home/HomePickerModal';
import { LlmSettingsModal } from '@/components/home/LlmSettingsModal';

export interface SharedComposerProps {
  variant: 'landing' | 'workspace';
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** workspace：斜杠菜单向上弹出 */
  slashPlacement?: 'inside' | 'above';
  /** AI任务着陆：隐藏 @ Agent，突出 Skill */
  hideAgent?: boolean;
  /** 压缩高度：对齐 AI广场「场景工具」卡片区 */
  compact?: boolean;
}

/**
 * 首页着陆与任务中心共用的输入壳，保证控件与心智连续。
 */
export function SharedComposer({
  variant,
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder,
  slashPlacement,
  hideAgent = false,
  compact = false,
}: SharedComposerProps) {
  const landing = variant === 'landing';
  const menuPlacement = slashPlacement ?? (landing ? 'inside' : 'above');
  const skillOnly = hideAgent || landing;
  const compactLanding = landing && compact;
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashMode, setSlashMode] = useState<'/' | '@'>('/');
  const [picker, setPicker] = useState<'agent' | 'skill' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const composerFocusKey = useHomeStore((s) => s.composerFocusKey);
  const currentChatId = useConversationStore((s) => s.currentChatId);
  const chats = useConversationStore((s) => s.chats);
  const platformRole = useSessionStore((s) => s.user?.platformRole);
  const executeAllowed = canExecuteChat(platformRole);
  const inputDisabled = disabled || !executeAllowed;
  const config = useLlmConfigStore((s) => s.config);
  const selectModel = useLlmConfigStore((s) => s.selectModel);
  const modelOptions = useLlmConfigStore((s) => s.modelOptions);
  const settingsOpen = useLlmConfigStore((s) => s.settingsOpen);
  const openSettings = useLlmConfigStore((s) => s.openSettings);
  const closeSettings = useLlmConfigStore((s) => s.closeSettings);
  const status = useMemo(() => useLlmConfigStore.getState().statusLabel(), [config]);

  const notify = (msg: string) => {
    useConversationStore.setState({ pushToast: msg });
  };

  const { listening, toggle: toggleVoice } = useSpeechInput((text) => {
    const prev = value.trim();
    onChange(prev ? `${prev} ${text}` : text);
    textareaRef.current?.focus();
  }, notify);

  const maxGrow = compactLanding ? 48 : landing ? 140 : 140;

  useEffect(() => {
    if (!landing || composerFocusKey <= 0) return;
    const t = window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [landing, composerFocusKey]);

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxGrow)}px`;
  };

  const handleInput = (next: string, cursor: number) => {
    onChange(next);
    const before = next.slice(0, cursor);
    if (before.match(/\/[^\s]*$/)) {
      setSlashMode('/');
      setSlashOpen(true);
    } else if (!skillOnly && before.match(/@[^\s]*$/)) {
      setSlashMode('@');
      setSlashOpen(true);
    } else {
      setSlashOpen(false);
    }
  };

  const insertSkill = (command: string) => {
    const val = value.replace(/\/[^\s]*$/, '').trimEnd();
    onChange((val ? `${val} ` : '') + command + ' ');
    setSlashOpen(false);
    setPicker(null);
    textareaRef.current?.focus();
  };

  const insertAgent = (name: string) => {
    const val = value.replace(/@[^\s]*$/, '').trimEnd();
    onChange((val ? `${val} ` : '') + `@${name} `);
    setSlashOpen(false);
    setPicker(null);
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || inputDisabled) return;
    if (!executeAllowed) {
      notify(READONLY_EXECUTE_HINT);
      return;
    }
    onSubmit(trimmed);
    onChange('');
    setSlashOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const applySuggestion = () => {
    if (!landing) {
      const chat = chats[currentChatId];
      const agent = chat?.agentId ? getAgentById(chat.agentId) : null;
      if (agent) {
        const tag = agent.homeTag as HomeCategory | undefined;
        const base = tag ? getHomeSuggestion(tag) : `@${agent.name} `;
        // 优先用当前任务 Agent 对应职能建议，并确保带上 @Agent
        const withAgent = base.includes(`@${agent.name}`)
          ? base
          : `@${agent.name} ${base.replace(/^@\S+\s*/, '')}`;
        onChange(withAgent);
        notify(`已按「${agent.name}」填入智能建议`);
        textareaRef.current?.focus();
        return;
      }
      if (chat?.title) {
        onChange(`继续推进：${chat.title}`);
        notify('已填入当前任务建议');
        textareaRef.current?.focus();
        return;
      }
    }
    const { expertAxis, category, regionId } = useHomeStore.getState();
    onChange(
      expertAxis === 'region' ? getHomeRegionSuggestion(regionId) : getHomeSuggestion(category),
    );
    notify('已填入智能建议');
    textareaRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(appendAttachmentReference(value, file.name));
    notify(`已添加附件引用：${file.name}`);
    e.target.value = '';
    textareaRef.current?.focus();
  };

  const defaultPlaceholder = !executeAllowed
    ? '只读模式：可浏览结果，不可发送执行'
    : landing
      ? '补充你的意图… / 调技能 · Enter 发送'
      : '继续对话… @ 专家 · / 技能 · Enter 发送';

  const slashMenu = slashOpen && executeAllowed ? (
    <HomeSlashMenu
      mode={slashMode}
      query={getSlashQuery(value, slashMode)}
      onSelectSkill={(skill) => insertSkill(skill.command)}
      onSelectAgent={(agent) => insertAgent(agent.name)}
      onClose={() => setSlashOpen(false)}
    />
  ) : null;

  return (
    <>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      <div
        className={cn(
          'relative w-full',
          !landing && 'shared-composer-workspace',
          compactLanding && 'h-full',
        )}
      >
        {!executeAllowed ? (
          <div className="mb-2 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
            {READONLY_EXECUTE_HINT}
          </div>
        ) : null}
        {menuPlacement === 'above' && slashOpen ? (
          <div className="absolute bottom-full left-0 right-0 z-40 mb-1">{slashMenu}</div>
        ) : null}

        <div
          className={cn(
            'wb-command-box overflow-hidden',
            !landing && 'wb-command-box--workspace',
            compactLanding && 'flex h-full min-h-0 flex-col border-0 shadow-none',
          )}
        >
          <textarea
            ref={textareaRef}
            rows={compactLanding ? 1 : landing ? 3 : 2}
            value={value}
            disabled={inputDisabled}
            readOnly={!executeAllowed}
            onChange={(e) => {
              handleInput(e.target.value, e.target.selectionStart ?? e.target.value.length);
              autoGrow(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSlashOpen(false);
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className={cn(
              'w-full resize-none bg-transparent text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:opacity-60',
              compactLanding
                ? 'min-h-0 flex-1 px-3 pb-0.5 pt-2 text-[12px] leading-snug'
                : landing
                  ? 'min-h-[74px] px-5 pb-1 pt-3 text-[14px] leading-relaxed md:text-[15px]'
                  : 'min-h-[52px] px-4 pb-1 pt-2.5 text-[13px] leading-relaxed',
            )}
            placeholder={placeholder ?? defaultPlaceholder}
          />

          {menuPlacement === 'inside' && slashOpen ? slashMenu : null}

          <div
            className={cn(
              'flex items-center justify-between gap-2 border-t border-zinc-200/80 bg-zinc-50/80',
              compactLanding
                ? 'h-[28px] shrink-0 flex-nowrap px-1.5 py-0'
                : landing
                  ? 'flex-wrap px-4 py-2'
                  : 'flex-wrap px-3 py-1.5',
            )}
          >
            <div
              className={cn(
                'flex items-center',
                compactLanding ? 'min-w-0 flex-nowrap gap-1 overflow-hidden' : 'flex-wrap gap-1.5',
              )}
            >
              <button
                type="button"
                onClick={() => setPicker('skill')}
                disabled={inputDisabled}
                className={cn(
                  'rounded-md border border-zinc-200 bg-white font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60',
                  compactLanding
                    ? 'h-5 shrink-0 px-1.5 text-[9px] leading-none'
                    : 'rounded-lg px-2.5 py-1.5 text-[11px]',
                )}
              >
                <i
                  className={cn(
                    'fa-solid fa-cube text-zinc-500',
                    compactLanding ? 'mr-0.5 text-[8px]' : 'mr-1 text-[10px]',
                  )}
                />
                / Skill
              </button>
              {!skillOnly ? (
                <button
                  type="button"
                  onClick={() => setPicker('agent')}
                  disabled={inputDisabled}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
                >
                  <i className="fa-solid fa-robot mr-1 text-[10px] text-zinc-500" />
                  @ Agent
                </button>
              ) : null}
              <select
                value={config.model}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__configure__') {
                    openSettings({ focusAdd: true });
                    return;
                  }
                  selectModel(v);
                }}
                disabled={inputDisabled}
                className={cn(
                  'border border-zinc-200 bg-white text-zinc-800 disabled:opacity-60',
                  compactLanding
                    ? 'h-5 max-w-[112px] shrink rounded-md px-1 text-[9px] leading-none'
                    : 'max-w-[168px] rounded-lg px-2.5 py-1.5 text-[11px]',
                )}
                title="选择模型 · 可配置 API"
              >
                <optgroup label="默认模型">
                  {modelOptions()
                    .filter((m) => m.group === 'default')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                </optgroup>
                {modelOptions().some((m) => m.group === 'custom') ? (
                  <optgroup label="自定义">
                    {modelOptions()
                      .filter((m) => m.group === 'custom')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                  </optgroup>
                ) : null}
                <option value="__configure__">＋ 配置 / 添加模型…</option>
              </select>
            </div>

            <div className={cn('flex shrink-0 items-center', compactLanding ? 'gap-0' : 'gap-0.5')}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={inputDisabled}
                className={cn(
                  'flex items-center justify-center text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-60',
                  compactLanding ? 'h-5 w-5 rounded' : 'h-8 w-8 rounded-lg',
                )}
                title="添加附件引用"
              >
                <i className={cn('fa-solid fa-paperclip', compactLanding ? 'text-[10px]' : 'text-[13px]')} />
              </button>
              {!landing ? (
                <button
                  type="button"
                  onClick={applySuggestion}
                  disabled={inputDisabled}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-60"
                  title="智能建议"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-[13px]" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={toggleVoice}
                disabled={inputDisabled}
                className={cn(
                  'flex items-center justify-center transition disabled:opacity-60',
                  compactLanding ? 'h-5 w-5 rounded' : 'h-8 w-8 rounded-lg',
                  listening
                    ? 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300/60'
                    : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600',
                )}
                title={listening ? '停止语音输入' : '语音输入'}
              >
                <i className={cn('fa-solid fa-microphone', compactLanding ? 'text-[10px]' : 'text-[13px]')} />
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={inputDisabled}
                className={cn(
                  'apple-btn-primary flex items-center justify-center text-white disabled:opacity-50',
                  compactLanding ? 'h-5 w-5 rounded' : 'h-8 w-8 rounded-lg',
                )}
              >
                <i className={cn('fa-solid fa-arrow-up', compactLanding ? 'text-[10px]' : 'text-[13px]')} />
              </button>
            </div>
          </div>

          {!landing ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-4 py-1.5 text-[11px] text-zinc-500">
              <span className={cn('truncate text-[10px]', status.configured && 'font-medium text-emerald-600/90')}>
                {status.text}
              </span>
            </div>
          ) : compactLanding ? null : (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-4 py-1.5 text-[10px] text-zinc-400">
              <span>{skillOnly ? 'Enter 发送 · / Skill' : 'Enter 发送 · @ Agent · / Skill'}</span>
              <span className={cn(status.configured && 'font-medium text-emerald-600/90')}>{status.text}</span>
            </div>
          )}
        </div>
      </div>

      {picker && (
        <HomePickerModal
          type={picker}
          onClose={() => setPicker(null)}
          onPickSkill={(skill) => insertSkill(skill.command)}
          onPickAgent={(agent) => insertAgent(agent.name)}
        />
      )}

      <LlmSettingsModal open={settingsOpen} onClose={closeSettings} />
    </>
  );
}
