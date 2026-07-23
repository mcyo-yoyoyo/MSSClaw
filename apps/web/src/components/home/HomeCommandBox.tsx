import { SharedComposer } from '@/components/chat/SharedComposer';
import { useHomeStore } from '@/stores/homeStore';

interface HomeCommandBoxProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  /** 对齐 AI广场场景工具卡片区高度 */
  compact?: boolean;
}

export function HomeCommandBox({ onSubmit, placeholder, compact }: HomeCommandBoxProps) {
  const draftText = useHomeStore((s) => s.draftText);
  const setDraftText = useHomeStore((s) => s.setDraftText);

  return (
    <SharedComposer
      variant="landing"
      hideAgent
      compact={compact}
      value={draftText}
      onChange={setDraftText}
      onSubmit={onSubmit}
      placeholder={placeholder}
    />
  );
}
