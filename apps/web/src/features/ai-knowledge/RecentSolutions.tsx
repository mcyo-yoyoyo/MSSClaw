import { formatSolutionDate, type AiKnowledgeSolution } from '@/domain/aiKnowledge';
import { useSavedSolutions } from './useSavedSolutions';
import './recentSolutions.css';

export function RecentSolutions({ onOpen, onViewAll, disabled }: {
  onOpen: (solution: AiKnowledgeSolution, isLocal: boolean) => void;
  onViewAll: () => void;
  disabled: boolean;
}) {
  const { entries, loading, error, reload } = useSavedSolutions(3);
  return <section className="knowledge-recent-solutions" aria-labelledby="knowledge-recent-title">
    <header className="knowledge-recent-header">
      <h2 id="knowledge-recent-title">最近生成的方案</h2>
      <button type="button" className="knowledge-recent-all" onClick={onViewAll} aria-label="查看全部历史方案">
        查看全部<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
      </button>
    </header>
    {entries.length > 0 && <ul className="knowledge-recent-grid">{entries.map(({ solution, isLocal }) => <li key={solution.id}>
      <button type="button" className="knowledge-recent-card" disabled={disabled} onClick={() => onOpen(solution, isLocal)} title={solution.title}>
        <span className="knowledge-recent-card-title">{solution.title}</span>
        <time dateTime={solution.createdAt}>{solution.createdAt ? formatSolutionDate(solution.createdAt) : '时间未记录'}</time>
      </button>
    </li>)}</ul>}
    {error ? <p className="knowledge-recent-status" role="status">{error}<button type="button" className="knowledge-recent-retry" onClick={reload}>重试</button></p>
      : loading && !entries.length ? <p className="knowledge-recent-status" role="status">正在加载方案…</p>
      : !entries.length && <p className="knowledge-recent-status">生成的方案会保存在这里</p>}
  </section>;
}
