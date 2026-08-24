'use server';

export async function verifyCEO(identifier: string): Promise<boolean> {
  if (!identifier) return false;
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return false;
  return identifier.trim().toLowerCase() === adminKey.trim().toLowerCase();
}

