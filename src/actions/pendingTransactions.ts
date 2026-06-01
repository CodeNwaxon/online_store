'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export type TransactionType = 'checkout' | 'installment_deposit' | 'installment_repayment';

export async function createPendingTransaction(type: TransactionType, data: any): Promise<{ success: boolean; reference?: string; error?: string }> {
  try {
    const reference = `ref_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;

    await adminDb.collection('pending_transactions').doc(reference).set({
      type,
      data,
      status: 'pending', // 'pending', 'completed'
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, reference };
  } catch (error) {
    console.error('Error creating pending transaction:', error);
    return { success: false, error: 'Failed to initialize transaction.' };
  }
}
