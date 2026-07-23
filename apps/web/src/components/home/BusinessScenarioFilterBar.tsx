import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import {
  HOME_FILTER_CHIP_ACTIVE,
  HOME_FILTER_CHIP_CLASS,
  HOME_FILTER_CHIP_IDLE,
  HOME_FILTER_TRACK_CLASS,
} from '@/components/home/homeFilterChrome';

interface BusinessScenarioFilterBarProps {
  value: BusinessScenarioId | 'all';
  onChange: (next: BusinessScenarioId | 'all') => void;
  className?: string;
}

/**
 * 业务场景 Tab：四字短标签、完整换行、无横向滚动。
 * 仅展示 tabVisible 的业务场景。高度与场景工具 / 组织视角对齐。
 */
export function BusinessScenarioFilterBar({
  value,
  onChange,
  className,
}: BusinessScenarioFilterBarProps) {
  const categories = listVisibleBusinessScenarioCategories();

  useEffect(() => {
    if (value === 'all') return;
    if (!listVisibleBusinessScenarioCategories().some((c) => c.id === value)) {
      onChange('all');
    }
  }, [value, onChange]);

  return (
    <div className={cn(HOME_FILTER_TRACK_CLASS, className)}>
      <button
        type="button"
        onClick={() => onChange('all')}
        className={cn(
          HOME_FILTER_CHIP_CLASS,
          value === 'all' ? HOME_FILTER_CHIP_ACTIVE : HOME_FILTER_CHIP_IDLE,
        )}
      >
        全部
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          title={c.blurb}
          onClick={() => onChange(c.id)}
          className={cn(
            HOME_FILTER_CHIP_CLASS,
            value === c.id ? HOME_FILTER_CHIP_ACTIVE : HOME_FILTER_CHIP_IDLE,
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
