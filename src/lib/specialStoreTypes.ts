export interface SpecialStore {
  name: string;
  slug: string;
  slogan?: string;
  banner?: string;
  lastNameEdit?: string; // ISO date string
  lastBannerEdit?: string; // ISO date string
  ownerEmail: string;
  ownerUid: string;
}

export function generateStoreSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Checks if a vendor is allowed to edit a specific field (name or banner) based on the once-per-month rule.
 * The rule resets on the 1st of every month.
 */
export function canEditStoreField(lastEditDateStr: string | undefined, isCEO: boolean): { allowed: boolean; nextEditDate?: Date; reason?: string } {
  if (isCEO) return { allowed: true }; // CEO can always edit

  if (!lastEditDateStr) return { allowed: true }; // Never edited before

  const lastEditDate = new Date(lastEditDateStr);
  const now = new Date();

  // If the last edit was in a previous calendar month or year, they can edit
  if (now.getFullYear() > lastEditDate.getFullYear() || now.getMonth() > lastEditDate.getMonth()) {
    return { allowed: true };
  }

  // Otherwise, they have to wait until the 1st of the next month
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { 
    allowed: false, 
    nextEditDate: nextMonth,
    reason: 'You can only change this field once per calendar month.' 
  };
}
