'use server';

import { adminDb } from '@/lib/firebaseAdmin';

export async function saveShuffleSettingAction(collectionKey: string, enabled: boolean) {
  try {
    if (!collectionKey) return { success: false, error: 'Missing collectionKey' };
    await adminDb.collection('settings').doc('shuffle').set(
      { [collectionKey]: enabled },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error('saveShuffleSettingAction error:', error);
    return { success: false, error: error?.message || 'Server error' };
  }
}
