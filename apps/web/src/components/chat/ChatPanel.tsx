import { useEffect, useRef, useState } from 'react';
import type { ChatConfig } from '@/domain/chat';
import { MessageBubble } from '@/components/chat/MessageBubble';

interface ChatPanelProps {
  chat: ChatConfig;
  onSend: (text: string) => Promise<void>;
  isAgentTyping: boolean;
  streamStatus?: string | null;
  onCancelStream?: () => void;
}

export function ChatPanel({ chat, onSend, isAgentTyping, streamStatus, onCancelStream }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(true);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.history]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isAgentTyping) return;
    setInput('');
    setMenuOpen(false);
    await onSend(text);
  };

  const handleQuickPrompt = async (prompt: string) => {
    setMenuOpen(false);
    await onSend(prompt);
  };

  return (
    <main className="relative z-30 flex w-[420px] shrink-0 flex-col border-r border-black/[0.06] bg-white">
      <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-black/[0.06] bg-white/90 px-5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div
            className={`relative flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm ${
              chat.type === 'group' ? 'bg-gradient-to-br from-zinc-600 to-zinc-800' : `bg-${chat.color}-600`
            }`}
          >
            <i className={`fa-solid ${chat.icon}`} />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold leading-tight text-zinc-900">{chat.title}</h2>
            <span className={`text-[10px] ${chat.type === 'bot' ? `text-${chat.color}-600 font-medium` : 'text-zinc-400'}`}>
              {chat.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-zinc-400">
          <button type="button" className="transition hover:text-zinc-800">
            <i className="fa-solid fa-magnifying-glass" />
          </button>
          <button type="button" className="transition hover:text-zinc-800">
            <i className="fa-solid fa-ellipsis-vertical" />
          </button>
        </div>
      </header>

      {streamStatus && (
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-2 text-[11px] text-zinc-700">
          <span className="flex items-center gap-2 font-medium">
            <i className="fa-solid fa-circle-notch fa-spin text-zinc-500" />
            {streamStatus}
          </span>
          {onCancelStream && (
            <button type="button" onClick={onCancelStream} className="font-bold text-zinc-600 hover:text-zinc-900">
              取消
            </button>
          )}
        </div>
      )}

      <div ref={messagesRef} className="chat-bg scroll-hidden flex-grow space-y-4 overflow-y-auto p-5">
        {chat.history.map((message, index) => (
          <MessageBubble
            key={`${message.role}-${index}`}
            message={message}
            accentColor={chat.color}
            iconClass={chat.icon}
          />
        ))}
      </div>

      {menuOpen && chat.prompts.length > 0 && (
        <div className="border-t border-black/[0.06] bg-white/95 p-2 backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-[10px] font-bold uppercase text-[#aeaeb2]">
              <i className="fa-solid fa-bolt mr-1" /> 快捷引导指令 (Command)
            </span>
            <button type="button" onClick={() => setMenuOpen(false)} className="cursor-pointer text-[10px] text-slate-300">
              <i className="fa-solid fa-chevron-down" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {chat.prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                className="group line-clamp-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-[12px] text-zinc-600 transition hover:border-zinc-300 hover:bg-white"
              >
                <i className="fa-solid fa-terminal mr-1 text-[10px] text-zinc-400 group-hover:text-zinc-600" />
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-black/[0.06] bg-white p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2 transition-all focus-within:border-zinc-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/10">
          <button type="button" className="shrink-0 p-2 text-zinc-400 transition hover:text-zinc-700" title="上传业务报表">
            <i className="fa-solid fa-paperclip text-lg" />
          </button>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            className="max-h-32 w-full resize-none bg-transparent p-2 text-[14px] text-zinc-900 focus:outline-none"
            placeholder="输入消息，或输入 @ 唤醒 Agent..."
          />
          <button
            type="button"
            onClick={() => setInput((v) => `${v}@Agent `)}
            className="shrink-0 p-2 text-zinc-400 transition hover:text-zinc-700"
            title="唤醒 Agent"
          >
            <i className="fa-solid fa-at text-lg" />
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isAgentTyping}
            className="apple-btn-primary ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-50"
          >
            <i className="fa-solid fa-paper-plane" />
          </button>
        </div>
      </div>
    </main>
  );
}
