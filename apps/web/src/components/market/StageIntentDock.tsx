import { cn } from '@/lib/utils';
import {
  intentSearchHintExamples,
  type IntentSearchScope,
} from '@/domain/capabilityIntentSearch';
import { writeAppRouteToLocation } from '@/domain/appRoute';
import { stageAiKnowledgeEntry } from '@/domain/aiKnowledgeEntry';
import { useAppViewStore } from '@/stores/appViewStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';

/**
 * 四页统一：标题下方的 AI 对话框搜索
 * 写入关键词后直接过滤当页列表，不在框下再铺匹配卡
 */
export function StageIntentDock({
  scope = 'home',
  placeholder = '描述你要做的事，或输入工具名称…',
  suggestions,
  className,
}: {
  scope?: IntentSearchScope;
  placeholder?: string;
  suggestions?: readonly string[];
  className?: string;
}) {
  const search = useMarketFilterStore((s) => s.search);
  const setSearch = useMarketFilterStore((s) => s.setSearch);
  const setAppView = useAppViewStore((s) => s.setAppView);

  const examples = suggestions ?? intentSearchHintExamples(scope);

  const run = (next: string) => {
    setSearch(next);
  };

  const enterAiKnowledge = () => {
    const question = search.trim();
    if (!question) return;
    stageAiKnowledgeEntry(question, scope);
    writeAppRouteToLocation({ view: 'ai-knowledge' });
    setAppView('ai-knowledge');
  };

  return (
    <div className={cn('stage-intent-dock', className)}>
      <form
        className="stage-intent-dock__composer"
        onSubmit={(e) => {
          e.preventDefault();
          enterAiKnowledge();
        }}
      >
        <i
          className="fa-solid fa-wand-magic-sparkles stage-intent-dock__icon"
          aria-hidden
        />
        <input
          value={search}
          onChange={(e) => run(e.target.value)}
          placeholder={placeholder}
          className="stage-intent-dock__input"
          aria-label="AI 搜索能力"
        />
        {search ? (
          <button
            type="button"
            onClick={() => run('')}
            className="stage-intent-dock__clear"
            aria-label="清除搜索"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        ) : null}
        <button
          type="submit"
          disabled={!search.trim()}
          className="stage-intent-dock__submit"
          aria-label="让 AI 智库帮我找"
        >
          <span>智库帮找</span>
          <i className="fa-solid fa-arrow-right" aria-hidden />
        </button>
      </form>

      <div className="stage-intent-dock__meta">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => run(ex)}
              className="stage-intent-dock__chip"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
