function toMillis(value: unknown): number {
  if (!value) return Number.NaN;
  if (typeof value === 'object' && value !== null) {
    const timestamp = value as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
    if (typeof timestamp.seconds === 'number') return timestamp.seconds * 1000;
  }
  return new Date(value as string | number).getTime();
}

export function isBlogPostExpired(post: Record<string, unknown>, now = Date.now()): boolean {
  const storedExpiry = toMillis(post.expiresAt);
  if (Number.isFinite(storedExpiry)) return storedExpiry <= now;

  const createdAt = toMillis(post.createdAt);
  if (!Number.isFinite(createdAt)) return false;

  const expiry = new Date(createdAt);
  expiry.setUTCFullYear(expiry.getUTCFullYear() + 1);
  return expiry.getTime() <= now;
}

export function getBlogExpiryDate(createdAt = new Date()): Date {
  const expiry = new Date(createdAt);
  expiry.setUTCFullYear(expiry.getUTCFullYear() + 1);
  return expiry;
}