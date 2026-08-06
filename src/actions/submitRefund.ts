'use server';

import { adminDb } from '@/lib/firebaseAdmin';

/**
 * Server action to submit an installment cancellation/refund request.
 * Runs on the server with admin privileges so it can:
 * 1. Update the installment document status to 'cancelling'
 * 2. Write a notification to the 'notifications' collection (customers can't write here from the client)
 */
export async function submitInstallmentRefund(data: {
  loanId: string;
  customerName: string;
  userEmail: string;
  productName: string;
  productImage: string;
  totalAmount: number;
  totalPaid: number;
  withdrawalPercent: number;
  refundDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
}) {
  try {
    const { loanId, totalPaid, withdrawalPercent, refundDetails } = data;

    const charge = totalPaid * (withdrawalPercent / 100);
    const refundAmount = Math.max(0, totalPaid - charge);

    const loanRef = adminDb.collection('installments').doc(loanId);
    const loanSnap = await loanRef.get();

    if (!loanSnap.exists) {
      return { success: false, error: 'Installment plan not found.' };
    }

    const loanData = loanSnap.data();
    if (loanData?.status !== 'active') {
      return { success: false, error: 'This plan is no longer active.' };
    }

    // Update the installment document
    await loanRef.update({
      status: 'cancelling',
      isNew: true,
      totalAmountPaid: totalPaid,
      refundDetails: {
        ...refundDetails,
        requestedAt: new Date().toISOString(),
        totalPaid: totalPaid,
        cancellationFee: charge,
        refundAmount: refundAmount,
        status: 'pending',
      },
    });

    // Create admin notification (server has full write access)
    await adminDb.collection('notifications').add({
      type: 'cancellation',
      title: 'Installment Cancellation',
      message: `A customer (${data.customerName || data.userEmail}) has requested a refund and cancelled their installment plan for ${data.productName}.`,
      adminRoute: '/ADMIN/INSTALLMENTS',
      read: false,
      createdAt: new Date().toISOString(),
      orderItems: [{
        name: data.productName || 'Product',
        image: data.productImage || '',
        price: data.totalAmount || 0,
        quantity: 1,
      }],
    });

    return { success: true };
  } catch (error) {
    console.error('Server: Failed to submit installment refund:', error);
    return { success: false, error: 'Failed to submit refund request.' };
  }
}
