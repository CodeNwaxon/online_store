'use client';

import { useMemo } from 'react';
import { shuffleWithLatestTwoFirst } from '@/lib/shuffleUtils';

/**
 * Returns a shuffled view of `items` (latest two updated first, then category-spaced shuffle)
 * that stays STABLE across re-renders. The order is only recomputed when the set of product
 * ids changes, shuffle is toggled, or `seed` changes — so typing, likes updates, etc.
 * don't cause products to jump around.
 */
export function useStableShuffle<T extends { id: string; [key: string]: any }>(
  items: T[],
  enabled: boolean,
  seed: number = 0
): T[] {
  const idsKey = items.map((i) => i.id).join('|');

  const order = useMemo(() => {
    if (!enabled) return null;
    return shuffleWithLatestTwoFirst(items).map((i) => i.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, enabled, seed]);

  return useMemo(() => {
    if (!order) return items;
    const byId = new Map(items.map((i) => [i.id, i]));
    return order.map((id) => byId.get(id)).filter(Boolean) as T[];
  }, [order, items]);
}
