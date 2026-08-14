import { useEffect } from 'react';
import { parseAppRoute } from '@/domain/appRoute';
import { useAppViewStore } from '@/stores/appViewStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { ViewLoadingFallback } from '@/components/common/ViewLoadingFallback';

/**
 * 深链 #/market-tool?id= 兜底：落到对应货架，详情由全局弹窗承接。
 */
export function MarketToolDetailPage() {
  const setAppView = useAppViewStore((s) => s.setAppView);
  const tools = useMarketplaceStore((s) => s.tools);
  const peekToolId = useNavigationIntentStore((s) => s.peekToolId);
  const peekReturnTarget = useNavigationIntentStore((s) => s.peekReturnTarget);
  const focusTool = useNavigationIntentStore((s) => s.focusTool);

  useEffect(() => {
    const route = parseAppRoute(window.location.hash);
    const id = peekToolId() || route.id || '';
    if (id && !peekToolId()) focusTool(id);

    const ret = peekReturnTarget();
    if (ret?.view && ret.view !== 'market-tool') {
      setAppView(ret.view);
      return;
    }
    const tool = tools.find((t) => t.id === id);
    if (tool?.sourceType === 'internal' || tool?.tags?.includes('hw-internal')) {
      setAppView('market-internal');
      return;
    }
    setAppView('market-external');
  }, [focusTool, peekReturnTarget, peekToolId, setAppView, tools]);

  return <ViewLoadingFallback label="正在打开工具…" />;
}
