'use client';

import { useMemo } from 'react';
import { shuffleWithLatestTwoFirst, shuffleWithCategorySpacing } from '@/lib/shuffleUtils';

/**
 * Returns a shuffled view of `items` that stays STABLE across re-renders.
 * The order is only recomputed when the set of product ids changes, shuffle is
 * toggled, or `seed` changes — so typing, likes updates, etc. don't cause
 * products to jump around.
 *
 * When `fullShuffle` is true the shuffle includes ALL items (no pinned first two).
 * When false (default), the two most-recently-updated items are pinned to the
 * front and only the rest are shuffled.
 */
export function useStableShuffle<T extends { id: string; [key: string]: any }>(
  items: T[],
  enabled: boolean,
  seed: number = 0,
  fullShuffle: boolean = false
): T[] {
  const idsKey = items.map((i) => i.id).join('|');

  const order = useMemo(() => {
    if (!enabled) return null;
    if (fullShuffle) {
      return shuffleWithCategorySpacing(items).map((i) => i.id);
    }
    return shuffleWithLatestTwoFirst(items).map((i) => i.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, enabled, seed, fullShuffle]);

  return useMemo(() => {
    if (!order) return items;
    const byId = new Map(items.map((i) => [i.id, i]));
    return order.map((id) => byId.get(id)).filter(Boolean) as T[];
  }, [order, items]);
}
