'use server';

export async function verifyCEO(uid: string): Promise<boolean> {
  return uid === process.env.ADMIN_KEY;
}
