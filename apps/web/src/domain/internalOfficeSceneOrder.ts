import type {
  InternalOfficeSceneCatalogEntry,
  InternalOfficeSceneId,
} from '@/domain/internalOfficeScenes';

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

/**
 * Reorders the complete visible scene sequence while keeping every hidden entry in
 * its original array slot. `beforeId === null` moves the active card to the end.
 *
 * `visibleIds` is the order rendered when dragging began. Requiring it to match the
 * current visible sequence prevents a stale, filtered, duplicated, or partial grid
 * from rebuilding the persisted document and accidentally dropping unseen entries.
 * Invalid and no-op requests return null, so callers must not issue a PUT.
 */
export function reorderVisibleOfficeSceneEntries(
  entries: readonly InternalOfficeSceneCatalogEntry[],
  activeId: InternalOfficeSceneId,
  beforeId: InternalOfficeSceneId | null,
  visibleIds: readonly InternalOfficeSceneId[],
): InternalOfficeSceneCatalogEntry[] | null {
  const currentVisibleIds = entries
    .filter((entry) => entry.visible)
    .map((entry) => entry.id);

  if (!sameIds(visibleIds, currentVisibleIds)) return null;
  if (!currentVisibleIds.includes(activeId)) return null;
  if (beforeId !== null && !currentVisibleIds.includes(beforeId)) return null;
  if (beforeId === activeId) return null;

  const reorderedVisibleIds = currentVisibleIds.filter((id) => id !== activeId);
  const targetIndex =
    beforeId === null
      ? reorderedVisibleIds.length
      : reorderedVisibleIds.indexOf(beforeId);
  if (targetIndex < 0) return null;
  reorderedVisibleIds.splice(targetIndex, 0, activeId);
  if (sameIds(reorderedVisibleIds, currentVisibleIds)) return null;

  const visibleById = new Map(
    entries.filter((entry) => entry.visible).map((entry) => [entry.id, entry]),
  );
  let visibleIndex = 0;
  return entries.map((entry) => {
    if (!entry.visible) return entry;
    const next = visibleById.get(reorderedVisibleIds[visibleIndex]);
    visibleIndex += 1;
    return next ?? entry;
  });
}
