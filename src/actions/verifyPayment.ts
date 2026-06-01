'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// ─── PAYSTACK VERIFICATION ──────────────────────────────────────────────
// This function contacts Paystack's server directly using the SECRET key
// to verify that a transaction actually happened and the correct amount was paid.
// This runs ONLY on the server — the secret key is never exposed to the browser.

async function verifyPaystackTransaction(reference: string): Promise<{
  success: boolean;
  amount: number; // amount in kobo
  email: string;
  error?: string;
}> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { success: false, amount: 0, email: '', error: 'Payment configuration error.' };
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.status === true && data.data.status === 'success') {
      return {
        success: true,
        amount: data.data.amount, // in kobo
        email: data.data.customer?.email || '',
      };
    }

    return { success: false, amount: 0, email: '', error: 'Transaction was not successful.' };
  } catch (error) {
    console.error('Paystack verification error:', error);
    return { success: false, amount: 0, email: '', error: 'Failed to verify payment.' };
  }
}

// ─── 1. STANDARD CHECKOUT ────────────────────────────────────────────────
// Called after user pays for normal cart items via Paystack popup.

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
}

interface OrderData {
  userId: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  items: OrderItem[];
  totalAmount: number;
  shippingFee: number;
  deliveryMethod: string;
}

export async function verifyAndFulfillOrder(
  reference: string,
  orderData: OrderData
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  // Step 1: Verify with Paystack
  const verification = await verifyPaystackTransaction(reference);

  if (!verification.success) {
    return { success: false, error: verification.error || 'Payment verification failed.' };
  }

  // Step 2: Verify the amount matches (Paystack amount is in kobo)
  const expectedAmountKobo = Math.round(orderData.totalAmount * 100);
  if (verification.amount < expectedAmountKobo) {
    console.error(
      `Amount mismatch! Expected: ${expectedAmountKobo} kobo, Got: ${verification.amount} kobo`
    );
    return { success: false, error: 'Payment amount does not match order total.' };
  }

  // Step 3: Re-verify product prices from the database to prevent price manipulation
  let serverCalculatedTotal = 0;
  for (const item of orderData.items) {
    const productDoc = await adminDb.collection('products').doc(item.id).get();
    if (!productDoc.exists) {
      return { success: false, error: `Product ${item.name} not found.` };
    }
    const productData = productDoc.data()!;
    serverCalculatedTotal += (productData.price || 0) * item.quantity;
  }

  // Validate shipping fee
  if (orderData.shippingFee < 0) {
    return { success: false, error: 'Invalid shipping fee.' };
  }

  // Add shipping fee from the order data (shipping is calculated based on distribution areas)
  serverCalculatedTotal += orderData.shippingFee;

  // Allow a small tolerance (1 naira) for rounding differences
  if (Math.abs(serverCalculatedTotal - orderData.totalAmount) > 1) {
    console.error(
      `Price mismatch! Server calculated: ${serverCalculatedTotal}, Client sent: ${orderData.totalAmount}`
    );
    return { success: false, error: 'Order total does not match product prices.' };
  }

  // Step 4: Everything checks out — create the order from the SERVER
  try {
    const orderRef = await adminDb.collection('orders').add({
      userId: orderData.userId,
      customerName: orderData.customerName,
      email: orderData.email,
      phone: orderData.phone,
      address: orderData.address,
      city: orderData.city,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      shippingFee: orderData.shippingFee,
      deliveryMethod: orderData.deliveryMethod,
      status: 'paid',
      type: 'normal',
      isNew: true,
      paystackReference: reference,
      verifiedByServer: true,
      createdAt: new Date().toISOString(),
    });

    // Deduct product quantities
    for (const item of orderData.items) {
      try {
        await adminDb.collection('products').doc(item.id).update({
          quantity: FieldValue.increment(-item.quantity),
        });
      } catch (err) {
        console.error('Error deducting quantity for product:', item.id, err);
      }
    }

    return { success: true, orderId: orderRef.id };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: 'Failed to create order.' };
  }
}

// ─── 2. INSTALLMENT INITIAL DEPOSIT ──────────────────────────────────────
// Called when a user pays their down payment to start a new installment plan.

interface InstallmentData {
  userId: string;
  userEmail: string;
  customerName: string;
  customerPhone: string;
  productId: string;
  productName: string;
  productCategory: string;
  productImage: string;
  basePrice: number;
  totalAmount: number;
  downPaymentAmount: number;
  planMonths: number;
  lateFeePercent: number;
  withdrawalFeePercent: number;
  gracePeriodDays: number;
}

export async function verifyAndCreateInstallment(
  reference: string,
  data: InstallmentData
): Promise<{ success: boolean; error?: string }> {
  // Step 1: Verify with Paystack
  const verification = await verifyPaystackTransaction(reference);

  if (!verification.success) {
    return { success: false, error: verification.error || 'Payment verification failed.' };
  }

  // Step 2: Verify product price from the database
  const productDoc = await adminDb.collection('products').doc(data.productId).get();
  if (!productDoc.exists) {
    return { success: false, error: 'Product not found.' };
  }
  const realProductPrice = productDoc.data()?.price || 0;

  // Step 3: Fetch Installment Settings to recalculate everything
  const settingsDoc = await adminDb.collection('settings').doc('installments').get();
  const instSettings = settingsDoc.data();
  if (!instSettings) {
    return { success: false, error: 'Installment configuration missing on server.' };
  }

  const currentPlanConfig = data.planMonths === instSettings.shortPlan.months ? instSettings.shortPlan : instSettings.longPlan;
  const increaseRate = (currentPlanConfig?.increase || 0) / 100;
  const increaseAmount = realProductPrice * increaseRate;
  const serverCalculatedTotalAmount = realProductPrice + increaseAmount;

  const applicableRate = realProductPrice >= (instSettings.downpaymentThreshold || 1000000)
    ? (instSettings.downpaymentOverThreshold || 50)
    : (instSettings.downpaymentUnderThreshold || 30);
  const minRequiredDownPayment = serverCalculatedTotalAmount * (applicableRate / 100);

  // Step 4: Verify the Paystack amount meets the minimum down payment requirement
  // Convert to kobo
  const minRequiredKobo = Math.round(minRequiredDownPayment * 100);
  if (verification.amount < minRequiredKobo) {
    console.error(`Downpayment mismatch! Expected min: ${minRequiredKobo} kobo, Got: ${verification.amount} kobo`);
    return { success: false, error: 'Payment amount is less than the required minimum down payment.' };
  }

  const actualPaidNaira = verification.amount / 100;

  // Step 5: Check for existing active loans
  const existingLoans = await adminDb
    .collection('installments')
    .where('userEmail', '==', data.userEmail)
    .where('status', 'in', ['active', 'cancelling'])
    .get();

  if (!existingLoans.empty) {
    return { success: false, error: 'You already have an active installment plan.' };
  }

  // Step 6: Create the installment and receipt from the SERVER
  try {
    const remainingBalance = serverCalculatedTotalAmount - actualPaidNaira;
    const monthlyAmount = remainingBalance / data.planMonths;

    const batch = adminDb.batch();
    const receiptRef = adminDb.collection('receipts').doc();
    const installmentRef = adminDb.collection('installments').doc();

    batch.set(receiptRef, {
      userId: data.userId,
      userEmail: data.userEmail,
      productName: data.productName,
      paymentName: 'Initial Deposit',
      amount: actualPaidNaira,
      paystackReference: reference,
      verifiedByServer: true,
      createdAt: FieldValue.serverTimestamp(),
      installmentId: installmentRef.id,
    });

    batch.set(installmentRef, {
      userId: data.userId,
      userEmail: data.userEmail,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      deliveryAddress: 'Pending (To be provided upon completion)',
      productId: data.productId,
      productName: data.productName,
      productCategory: data.productCategory,
      productImage: data.productImage,
      basePrice: realProductPrice,
      shippingFee: 0,
      totalAmount: serverCalculatedTotalAmount,
      monthlyAmount: monthlyAmount,
      planMonths: data.planMonths,
      downPaymentPaid: actualPaidNaira,
      totalAmountPaid: actualPaidNaira,
      monthsPaid: 0,
      lateFeePercent: data.lateFeePercent,
      withdrawalFeePercent: data.withdrawalFeePercent,
      gracePeriodDays: data.gracePeriodDays,
      payments: [
        {
          month: 1,
          amount: actualPaidNaira,
          status: 'paid',
          paidAt: new Date().toISOString(),
          deadline: new Date().toISOString(),
          receiptId: receiptRef.id,
        },
        ...Array.from({ length: data.planMonths }).map((_, i) => ({
          month: i + 2,
          amount: monthlyAmount,
          status: 'pending',
          deadline: new Date(
            Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })),
      ],
      status: 'active',
      isNew: true,
      paystackReference: reference,
      verifiedByServer: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error creating installment:', error);
    return { success: false, error: 'Failed to create installment plan.' };
  }
}

// ─── 3. INSTALLMENT REPAYMENT ────────────────────────────────────────────
// Called when a user pays one or more monthly installments.

interface InstallmentPaymentData {
  loanId: string;
  userId: string;
  userEmail: string;
  monthsToPay: number[]; // indices of months being paid
  baseAmount: number; // total amount for months being paid (no shipping)
  totalAmount: number; // base + shipping if final
  isLastPayment: boolean;
  // Final payment delivery info (only relevant if isLastPayment)
  deliveryMethod?: string;
  shippingAddress?: string;
  shippingFee?: number;
  phone?: string;
  city?: string;
  customerName?: string;
  email?: string;
}

export async function verifyAndProcessInstallmentPayment(
  reference: string,
  data: InstallmentPaymentData
): Promise<{ success: boolean; error?: string }> {
  // Step 1: Verify with Paystack
  const verification = await verifyPaystackTransaction(reference);

  if (!verification.success) {
    return { success: false, error: verification.error || 'Payment verification failed.' };
  }

  // Step 2: Get and verify the loan exists
  const loanDoc = await adminDb.collection('installments').doc(data.loanId).get();
  if (!loanDoc.exists) {
    return { success: false, error: 'Installment plan not found.' };
  }

  const loan = { id: loanDoc.id, ...loanDoc.data() } as any;

  // Verify the loan belongs to this user
  if (loan.userEmail !== data.userEmail) {
    return { success: false, error: 'Unauthorized access to this installment plan.' };
  }

  // Step 3: Calculate the expected amount on the server
  let serverCalculatedBaseAmount = 0;
  for (const idx of data.monthsToPay) {
    if (loan.payments[idx] && loan.payments[idx].status !== 'paid') {
      serverCalculatedBaseAmount += loan.payments[idx].amount;
    } else {
      return { success: false, error: 'Invalid or already paid month selected.' };
    }
  }

  const clientShippingFee = data.shippingFee || 0;
  if (data.isLastPayment && clientShippingFee < 0) {
    return { success: false, error: 'Invalid shipping fee.' };
  }

  const serverCalculatedTotalAmount = serverCalculatedBaseAmount + (data.isLastPayment ? clientShippingFee : 0);

  // Step 4: Verify the Paystack amount meets the calculated total
  const expectedAmountKobo = Math.round(serverCalculatedTotalAmount * 100);
  if (verification.amount < expectedAmountKobo) {
    console.error(
      `Installment amount mismatch! Expected: ${expectedAmountKobo} kobo, Got: ${verification.amount} kobo`
    );
    return { success: false, error: 'Payment amount does not match the required amount.' };
  }

  // Step 5: Process the payment from the SERVER
  try {
    const updatedPayments = [...loan.payments];

    for (const idx of data.monthsToPay) {
      const receiptRef = await adminDb.collection('receipts').add({
        userId: data.userId,
        userEmail: data.userEmail,
        productName: loan.productName,
        paymentName: `Month ${loan.payments[idx].month - 1}`,
        amount: loan.payments[idx].amount,
        paystackReference: reference,
        verifiedByServer: true,
        createdAt: new Date().toISOString(),
        installmentId: data.loanId,
      });

      updatedPayments[idx].status = 'paid';
      updatedPayments[idx].paidAt = new Date().toISOString();
      updatedPayments[idx].receiptId = receiptRef.id;
    }

    const newTotalPaid = (loan.totalAmountPaid || loan.downPaymentPaid || 0) + serverCalculatedBaseAmount;
    const updateData: any = {
      payments: updatedPayments,
      monthsPaid: loan.monthsPaid + data.monthsToPay.length,
      totalAmountPaid: newTotalPaid,
    };

    if (data.isLastPayment) {
      updateData.status = 'completed';
      updateData.completedAt = new Date().toISOString();
      updateData.shippingMethod =
        data.deliveryMethod === 'pickup' ? 'Office Pickup' : 'Delivery';
      updateData.shippingAddress = data.shippingAddress || '';
      updateData.phone = data.phone || '';

      // Create the order
      await adminDb.collection('orders').add({
        userId: data.userId,
        customerName: data.customerName || loan.customerName,
        email: data.email || data.userEmail,
        phone: data.phone || '',
        address: data.shippingAddress || '',
        city: data.city || '',
        items: [
          {
            id: loan.productId,
            name: loan.productName,
            price: loan.totalAmount,
            quantity: 1,
            image: loan.productImage,
          },
        ],
        totalAmount: loan.totalAmount + (data.isLastPayment ? clientShippingFee : 0),
        shippingFee: data.isLastPayment ? clientShippingFee : 0,
        deliveryMethod: data.deliveryMethod || 'pickup',
        status: 'paid',
        type: 'installment',
        isNew: true,
        installmentId: data.loanId,
        paystackReference: reference,
        verifiedByServer: true,
        createdAt: new Date().toISOString(),
      });

      // Deduct product quantity
      try {
        await adminDb.collection('products').doc(loan.productId).update({
          quantity: FieldValue.increment(-1),
        });
      } catch (err) {
        console.error('Error deducting product quantity:', err);
      }
    }

    await adminDb.collection('installments').doc(data.loanId).update(updateData);

    return { success: true };
  } catch (error) {
    console.error('Error processing installment payment:', error);
    return { success: false, error: 'Failed to process payment.' };
  }
}
