import { SharedComposer } from '@/components/chat/SharedComposer';
import { useHomeStore } from '@/stores/homeStore';

interface HomeCommandBoxProps {
  onSubmit: (text: string) => void;
}

export function HomeCommandBox({ onSubmit }: HomeCommandBoxProps) {
  const draftText = useHomeStore((s) => s.draftText);
  const setDraftText = useHomeStore((s) => s.setDraftText);

  return (
    <SharedComposer
      variant="landing"
      value={draftText}
      onChange={setDraftText}
      onSubmit={onSubmit}
    />
  );
}
