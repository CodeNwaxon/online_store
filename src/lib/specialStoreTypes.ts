export interface SpecialStore {
  name: string;
  slug: string;
  slogan?: string;
  banner?: string;
  lastNameEdit?: string; // Legacy
  lastBannerEdit?: string; // Legacy
  nameEditDates?: string[];
  bannerEditDates?: string[];
  accountNumber?: string;
  phoneNumber?: string;
  accountNumberEditDates?: string[];
  phoneNumberEditDates?: string[];
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
 * Checks if a vendor is allowed to edit a specific field (name or banner) based on the twice-per-month rule.
 * The rule resets on the 1st of every month.
 */
export function canEditStoreField(editDates: string[] | string | undefined, isCEO: boolean): { allowed: boolean; nextEditDate?: Date; reason?: string } {
  if (isCEO) return { allowed: true }; // CEO can always edit

  if (!editDates) return { allowed: true }; // Never edited before

  let dates: Date[] = [];
  if (Array.isArray(editDates)) {
    dates = editDates.map(d => new Date(d));
  } else {
    dates = [new Date(editDates)];
  }

  const now = new Date();
  
  // Count how many edits happened in the current month
  const currentMonthEdits = dates.filter(d => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth());

  // If less than 2 edits this month, they can edit
  if (currentMonthEdits.length < 2) {
    return { allowed: true };
  }

  // Otherwise, they have to wait until the 1st of the next month
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { 
    allowed: false, 
    nextEditDate: nextMonth,
    reason: 'You can only change this field twice per calendar month.' 
  };
}
