/**
 * Utility functions for product shuffling with category spacing constraints.
 */

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles a list of items so that items with the same category
 * do not appear more than `maxConsecutive` times (default 2) in a row,
 * unless a category's remaining count is uneven/dominant compared to the rest,
 * in which case it is minimized as much as mathematically possible.
 */
export function shuffleWithCategorySpacing<T extends { category?: string | null; [key: string]: any }>(
  items: T[],
  maxConsecutive: number = 2,
  initialLastCat: string | null = null,
  initialStreak: number = 0
): T[] {
  if (!items || items.length === 0) return [];
  if (items.length === 1 && !initialLastCat) return [...items];

  // Group items by normalized category name
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const rawCat = item.category;
    const cat = rawCat ? String(rawCat).trim().toLowerCase() : '_uncategorized_';
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(item);
  }

  // Pre-shuffle each category bucket
  for (const [cat, list] of buckets.entries()) {
    buckets.set(cat, shuffleArray(list));
  }

  const result: T[] = [];
  let lastCat: string | null = initialLastCat;
  let streak = initialStreak;
  let remainingTotal = items.length;

  while (remainingTotal > 0) {
    const nonEmptyCats: { cat: string; count: number }[] = [];
    for (const [cat, list] of buckets.entries()) {
      if (list.length > 0) {
        nonEmptyCats.push({ cat, count: list.length });
      }
    }

    if (nonEmptyCats.length === 0) break;

    // Filter allowed categories (cannot exceed maxConsecutive streak for same category)
    let allowed = nonEmptyCats;
    if (streak >= maxConsecutive && lastCat !== null) {
      const filtered = nonEmptyCats.filter(c => c.cat !== lastCat);
      if (filtered.length > 0) {
        allowed = filtered;
      }
    }

    // Sort allowed categories by remaining count descending
    allowed.sort((a, b) => b.count - a.count);

    let chosenCat: string;
    const top = allowed[0];
    const otherTotal = remainingTotal - top.count;

    // If top category count exceeds all other remaining categories combined,
    // we must pick it whenever eligible to prevent clumping at the end
    if (top.count > otherTotal && top.cat !== lastCat) {
      chosenCat = top.cat;
    } else {
      // Weighted random selection based on remaining count
      const totalWeight = allowed.reduce((sum, c) => sum + Math.pow(c.count, 1.2), 0);
      let rand = Math.random() * totalWeight;
      chosenCat = allowed[0].cat;
      for (const c of allowed) {
        rand -= Math.pow(c.count, 1.2);
        if (rand <= 0) {
          chosenCat = c.cat;
          break;
        }
      }
    }

    const bucket = buckets.get(chosenCat)!;
    const item = bucket.pop()!;
    result.push(item);
    remainingTotal--;

    if (chosenCat === lastCat) {
      streak++;
    } else {
      lastCat = chosenCat;
      streak = 1;
    }
  }

  return result;
}

/**
 * Shuffles items with category spacing, ensuring that the latest two updated products
 * (sorted by updatedAt or createdAt descending) always come first (positions 0 and 1),
 * while the remaining items are shuffled with category spacing (max 2 consecutive).
 */
export function shuffleWithLatestTwoFirst<T extends { category?: string | null; updatedAt?: any; createdAt?: any; [key: string]: any }>(
  items: T[],
  maxConsecutive: number = 2
): T[] {
  if (!items || items.length <= 2) return items ? [...items] : [];

  const parseDate = (d: any) => {
    if (!d) return 0;
    if (typeof d.toDate === 'function') return d.toDate().getTime();
    if (typeof d === 'object' && 'seconds' in d) return d.seconds * 1000;
    return new Date(d).getTime() || 0;
  };

  // Sort by updatedAt / createdAt descending to get the true latest 2
  const sorted = [...items].sort((a, b) => {
    const dateA = parseDate(a.updatedAt || a.createdAt);
    const dateB = parseDate(b.updatedAt || b.createdAt);
    return dateB - dateA;
  });

  const latestTwo = sorted.slice(0, 2);
  const remaining = sorted.slice(2);

  const cat0 = latestTwo[0]?.category ? String(latestTwo[0].category).trim().toLowerCase() : '_uncategorized_';
  const cat1 = latestTwo[1]?.category ? String(latestTwo[1].category).trim().toLowerCase() : '_uncategorized_';
  const isSameCat = cat0 === cat1;

  const shuffledRemaining = shuffleWithCategorySpacing(
    remaining,
    maxConsecutive,
    cat1,
    isSameCat ? 2 : 1
  );

  return [...latestTwo, ...shuffledRemaining];
}
