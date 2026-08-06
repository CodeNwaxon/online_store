'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/sendEmail';
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
  category?: string;
  group?: string;
  vendor?: string;
  collectionName?: string;
  selectedMeasurement?: string;
  selectedSize?: string;
  selectedColor?: string;
  measurementPrice?: number | null;
  measurementCostPrice?: number | null;
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
  referralCode?: string | null;
}

export async function verifyAndFulfillOrder(
  reference: string
): Promise<{ success: boolean; orderId?: string; orderData?: any; error?: string }> {
  // Step 0: Fetch Pending Transaction
  const pendingTxRef = adminDb.collection('pending_transactions').doc(reference);
  const pendingTxSnap = await pendingTxRef.get();

  if (!pendingTxSnap.exists) {
    return { success: false, error: 'Transaction record not found.' };
  }

  const pendingTx = pendingTxSnap.data()!;

  // Idempotency: If already completed, just return success and the orderId
  if (pendingTx.status === 'completed') {
    return { success: true, orderId: pendingTx.orderId, orderData: pendingTx.data };
  }

  const orderData = pendingTx.data as OrderData;

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
    const collections = ['products', 'foods', 'wears', 'cosmetics', 'toilet_kitchen', 'uk_used'];
    let productData = null;

    for (const coll of collections) {
      const productDoc = await adminDb.collection(coll).doc(item.id).get();
      if (productDoc.exists) {
        productData = productDoc.data()!;
        break;
      }
    }

    if (!productData) {
      return { success: false, error: `Item ${item.name} not found in products.` };
    }
    
    let itemPrice = productData.price || 0;
    let itemCost = productData.rdpPrice || productData.costPrice || 0;
    
    if (item.selectedMeasurement && productData.measurements) {
      try {
        const parsed = JSON.parse(productData.measurements);
        const mPrice = Number(parsed[item.selectedMeasurement]);
        if (!isNaN(mPrice) && mPrice > 0) {
           itemPrice = mPrice;
        }
      } catch (e) {
        // Fallback for old format or invalid JSON
      }
    }

    if (item.selectedMeasurement && productData.measurementCostPrices) {
      try {
        const parsedCost = JSON.parse(productData.measurementCostPrices);
        const mCost = Number(parsedCost[item.selectedMeasurement]);
        if (!isNaN(mCost) && mCost > 0) {
          itemCost = mCost;
        }
      } catch (e) {
        // Fallback for old format or invalid JSON
      }
    }
    
    serverCalculatedTotal += itemPrice * item.quantity;
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

  // Step 4: Everything checks out — create the order from the SERVER using a transaction to prevent race conditions
  try {
    const txResult = await adminDb.runTransaction(async (transaction) => {
      // Re-read the pending transaction to ensure it hasn't been completed by a concurrent request
      const txDoc = await transaction.get(pendingTxRef);
      if (!txDoc.exists) {
        throw new Error('Transaction record not found during finalization.');
      }

      const currentTxData = txDoc.data()!;
      if (currentTxData.status === 'completed') {
        return { success: true, orderId: currentTxData.orderId, orderData: currentTxData.data };
      }

      // Check for returning customer (by email or phone)
      let isReturningCustomer = false;
      let previousReferralCode: string | null = null;

      const emailQuery = await transaction.get(adminDb.collection('orders').where('email', '==', orderData.email).limit(1));
      const phoneQuery = await transaction.get(adminDb.collection('orders').where('phone', '==', orderData.phone).limit(1));

      if (!emailQuery.empty) {
        isReturningCustomer = true;
        previousReferralCode = emailQuery.docs[0].data().referralCode || previousReferralCode;
      } else if (!phoneQuery.empty) {
        isReturningCustomer = true;
        previousReferralCode = phoneQuery.docs[0].data().referralCode || previousReferralCode;
      }

      // ALWAYS map items to include rdpPrice and vendor
      let totalProfitForReferral = 0;
      const itemsWithCostAndVendor: any[] = [];
      for (const item of orderData.items) {
        const sellPrice = item.price || 0;
        const collections = ['products', 'foods', 'wears', 'cosmetics', 'toilet_kitchen', 'uk_used'];
        let productDoc = null;
        let foundCollection = 'products'; // fallback

        for (const coll of collections) {
          const docSnap = await transaction.get(adminDb.collection(coll).doc(item.id));
          if (docSnap.exists) {
            productDoc = docSnap;
            foundCollection = coll;
            break;
          }
        }

        const productData = productDoc?.data();
        let rdpPrice = productData ? (productData.rdpPrice || productData.costPrice || 0) : 0;
        if (item.selectedMeasurement && productData?.measurementCostPrices) {
          try {
            const parsedCosts = JSON.parse(String(productData.measurementCostPrices));
            const selectedCost = Number(parsedCosts[item.selectedMeasurement]);
            if (!isNaN(selectedCost) && selectedCost > 0) {
              rdpPrice = selectedCost;
            }
          } catch (e) {
            // ignore invalid measurement cost data
          }
        }
        const vendorEmail = productDoc ? (productDoc?.data()?.vendor || null) : (item.vendor || null);
        totalProfitForReferral += Math.max(0, sellPrice - rdpPrice) * item.quantity;

        itemsWithCostAndVendor.push({
          ...item,
          rdpPrice,
          vendor: vendorEmail,
          _collection: foundCollection
        });
      }
      orderData.items = itemsWithCostAndVendor;

      let finalReferralCode = orderData.referralCode;
      let partnerCutPercentage = 50;

      if (isReturningCustomer && previousReferralCode) {
        finalReferralCode = previousReferralCode;
      }

      if (finalReferralCode) {
        // Verify partner and fetch percentages
        const partnersQuery = await transaction.get(adminDb.collection('partners').where('referralCode', '==', finalReferralCode).where('status', '==', 'approved').limit(1));

        if (partnersQuery.empty) {
          finalReferralCode = null;
        } else {
          const partnerDoc = partnersQuery.docs[0];
          const partnerData = partnerDoc.data();

          if (isReturningCustomer && !partnerData.isVip) {
            // Regular partners do not get commission for returning customers
            finalReferralCode = null;
          } else {
            // Fetch percentages
            const settingsDoc = await transaction.get(adminDb.collection('settings').doc('partnership'));
            const settings = settingsDoc.exists ? settingsDoc.data()! : {};

            if (isReturningCustomer && partnerData.isVip) {
              partnerCutPercentage = settings.vipPercentage !== undefined ? settings.vipPercentage : 20;
            } else {
              partnerCutPercentage = settings.globalPercentage !== undefined ? settings.globalPercentage : 50;
            }

            // Calculate total profit and earnings
            let totalProfit = 0;

            // The items mapping has been moved above so it happens for all orders.

            const partnerEarnings = totalProfitForReferral * (partnerCutPercentage / 100);

            // Increment partner's totalEarnings and referral counts
            transaction.update(partnerDoc.ref, {
              totalEarnings: FieldValue.increment(partnerEarnings),
              outstandingEarnings: FieldValue.increment(partnerEarnings),
              referralCount: FieldValue.increment(1),
              lastEarningAt: new Date().toISOString()
            });
          }
        }
      }

      const orderRef = adminDb.collection('orders').doc();
      transaction.set(orderRef, {
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
        referralCode: finalReferralCode || null,
        partnerCutPercentage: finalReferralCode ? partnerCutPercentage : null,
        partnerPaid: finalReferralCode ? false : null,
        createdAt: new Date().toISOString(),
      });

      // Deduct product quantities
      for (const item of orderData.items) {
        const collectionName = (item as any)._collection || 'products';
        const productRef = adminDb.collection(collectionName).doc(item.id);
        transaction.update(productRef, {
          quantity: FieldValue.increment(-item.quantity),
        });
        delete (item as any)._collection; // clean up before saving to db
      }

      // Increment public sales counts in settings/salesCounts
      // This makes sales ratings visible to ALL users (including unauthenticated)
      const salesCountsRef = adminDb.collection('settings').doc('salesCounts');

      // First accumulate raw counts
      let totalQty = 0;
      const categoryCounts: Record<string, number> = { furniture: 0, food: 0, toilet_kitchen: 0, wears: 0, cosmetics: 0, uk_used: 0 };
      const vendorCounts: Record<string, number> = {};

      for (const item of orderData.items) {
        const qty = item.quantity || 1;
        totalQty += qty;

        const coll = String(item.collectionName || '').toLowerCase();
        const group = String(item.group || '').toLowerCase();
        const category = String(item.category || '').toLowerCase();
        const itemName = String(item.name || '').toLowerCase();

        const isFurniture =
          coll.includes('furniture') ||
          group.includes('furniture') ||
          category.includes('furniture') ||
          itemName.includes('furniture') ||
          itemName.includes('chair') ||
          itemName.includes('table') ||
          itemName.includes('sofa') ||
          itemName.includes('desk') ||
          itemName.includes('bed');

        if (isFurniture) {
          categoryCounts.furniture += qty;
        } else if (coll === 'foods' || group === 'foods' || group.includes('food') || category === 'food market') {
          categoryCounts.food += qty;
        } else if (
          coll === 'toilet_kitchen' ||
          group.includes('toilet') ||
          group.includes('kitchen') ||
          category.includes('toilet') ||
          category.includes('kitchen')
        ) {
          categoryCounts.toilet_kitchen += qty;
        } else if (
          coll === 'wears' ||
          group.includes('wears') ||
          group.includes('clothing') ||
          category.includes('wears')
        ) {
          categoryCounts.wears += qty;
        } else if (coll === 'cosmetics' || group.includes('cosmetics') || category.includes('cosmetics')) {
          categoryCounts.cosmetics += qty;
        } else if (coll === 'uk_used' || coll === 'uk-used' || group.includes('used') || category.includes('used')) {
          categoryCounts.uk_used += qty;
        }

        if (item.vendor) {
          const vendorKey = String(item.vendor).toLowerCase().trim().replace(/\./g, '_');
          vendorCounts[vendorKey] = (vendorCounts[vendorKey] || 0) + qty;
        }
      }

      // Build the update object with FieldValue.increment
      const salesUpdates: Record<string, any> = {
        shop: FieldValue.increment(totalQty),
      };
      for (const [cat, count] of Object.entries(categoryCounts)) {
        if (count > 0) salesUpdates[cat] = FieldValue.increment(count);
      }
      for (const [vendor, count] of Object.entries(vendorCounts)) {
        salesUpdates[`vendors.${vendor}`] = FieldValue.increment(count);
      }

      transaction.set(salesCountsRef, salesUpdates, { merge: true });

      // Mark pending transaction as completed
      transaction.update(pendingTxRef, {
        status: 'completed',
        orderId: orderRef.id,
        completedAt: FieldValue.serverTimestamp(),
      });

      // Create Admin/Vendor Notifications with templates and images
      // Fetch notification templates for customizable messages
      const templatesDoc = await adminDb.collection('settings').doc('notification_templates').get();
      const templates = templatesDoc.exists ? templatesDoc.data() || {} : {};

      // Get the first product image for the notification
      const firstImage = orderData.items?.[0]?.image || '';

      // Collect all unique vendor emails from the order
      const vendorEmails = new Set<string>();
      for (const item of orderData.items) {
        if (item.vendor) vendorEmails.add(item.vendor);
      }

      // 1. Create the global admin notification (seen by CEO and VIP admins)
      const orderNotifRef = adminDb.collection('notifications').doc();
      transaction.set(orderNotifRef, {
        type: 'order',
        title: 'New Order',
        message: templates.vendorOrder || 'A new order containing your products has been placed.',
        orderId: orderRef.id,
        createdAt: new Date().toISOString(),
        read: false,
        adminRoute: '/ADMIN/ORDERS',
        orderItems: orderData.items.map((item: any) => ({
          name: item.name || 'Product',
          image: item.image || '',
          quantity: item.quantity || 1,
          price: item.price || 0,
          selectedSize: item.selectedSize || '',
          selectedColor: item.selectedColor || '',
          ram: item.ram || '',
          rom: item.rom || '',
        })),
      });

      // 2. Create vendor-specific notifications
      //    (We handle hiding duplicate notifications in the frontend for VIP/CEO admins)
      for (const vendorEmail of vendorEmails) {
        // Filter items to only this vendor's products
        const vendorItems = orderData.items.filter((item: any) => item.vendor === vendorEmail);
        const vendorFirstImage = vendorItems[0]?.image || firstImage;

        const vendorNotifRef = adminDb.collection('notifications').doc();
        transaction.set(vendorNotifRef, {
          type: 'vendor_order',
          title: 'New Order',
          message: templates.vendorOrder || 'A new order containing your products has been placed.',
          orderId: orderRef.id,
          vendorEmail: vendorEmail,
          createdAt: new Date().toISOString(),
          read: false,
          adminRoute: '/ADMIN/ORDERS',
          orderItems: vendorItems.map((item: any) => ({
            name: item.name || 'Product',
            image: item.image || '',
            quantity: item.quantity || 1,
            price: item.price || 0,
            selectedSize: item.selectedSize || '',
            selectedColor: item.selectedColor || '',
            ram: item.ram || '',
            rom: item.rom || '',
          })),
        });
      }

      // 3. Create customer notification for placing the order
      if (orderData.userId && orderData.userId !== 'guest') {
        const customerNotifRef = adminDb.collection('broadcasts').doc();
        transaction.set(customerNotifRef, {
          type: 'order_placed',
          title: 'Order Placed Successfully',
          message: `Your order containing ${orderData.items?.[0]?.name || 'an item'}${orderData.items.length > 1 ? ` and ${orderData.items.length - 1} other item(s)` : ''} has been placed. We are preparing it for delivery.`,
          customerUid: orderData.userId,
          createdAt: new Date().toISOString(),
          read: false,
          orderItems: orderData.items.map((item: any) => ({
            name: item.name || 'Product',
            image: item.image || '',
            quantity: item.quantity || 1,
            price: item.price || 0,
            selectedSize: item.selectedSize || '',
            selectedColor: item.selectedColor || '',
            ram: item.ram || '',
            rom: item.rom || '',
          })),
        });
      }

      return { success: true, orderId: orderRef.id, orderData };
    });

    if (txResult.success && txResult.orderData) {
       sendEmail({
         to: txResult.orderData.email,
         subject: 'Order Confirmation - Nomo Store',
         html: `<p>Hi ${txResult.orderData.customerName},</p><p>Your order has been placed successfully.</p><p>Thank you for shopping with us!</p>`
       }).catch(console.error);

       const vendorsToEmail = new Set<string>();
       for (const item of txResult.orderData.items) {
         if (item.vendor) vendorsToEmail.add(item.vendor);
       }
       for (const vendorEmail of vendorsToEmail) {
         sendEmail({
           to: vendorEmail,
           subject: 'New Order for your Products!',
           html: `<p>Hello Vendor,</p><p>A new order has been placed that includes your products. Please log in to your dashboard to view the details.</p>`
         }).catch(console.error);
       }
    }
    return txResult;
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
  referralCode?: string | null;
}

export async function verifyAndCreateInstallment(
  reference: string
): Promise<{ success: boolean; error?: string }> {
  // Step 0: Fetch Pending Transaction
  const pendingTxRef = adminDb.collection('pending_transactions').doc(reference);
  const pendingTxSnap = await pendingTxRef.get();

  if (!pendingTxSnap.exists) {
    return { success: false, error: 'Transaction record not found.' };
  }

  const pendingTx = pendingTxSnap.data()!;

  // Idempotency: If already completed, just return success
  if (pendingTx.status === 'completed') {
    return { success: true };
  }

  const data = pendingTx.data as InstallmentData;

  // Step 1: Verify with Paystack
  const verification = await verifyPaystackTransaction(reference);

  if (!verification.success) {
    return { success: false, error: verification.error || 'Payment verification failed.' };
  }

  // Step 2: Verify product price from the database
  const collections = ['products', 'foods', 'wears', 'cosmetics', 'toilet_kitchen', 'uk_used'];
  let productDoc: any = null;
  let foundCollection = 'products';

  for (const coll of collections) {
    const docSnap = await adminDb.collection(coll).doc(data.productId).get();
    if (docSnap.exists) {
      productDoc = docSnap;
      foundCollection = coll;
      break;
    }
  }

  if (!productDoc) {
    return { success: false, error: 'Product not found.' };
  }
  const realProductPrice = productDoc.data()?.price || 0;

  // Step 3: Fetch Installment Settings to recalculate everything
  const settingsDoc = await adminDb.collection('settings').doc('installments').get();
  const instSettings = settingsDoc.data();
  if (!instSettings) {
    return { success: false, error: 'Installment configuration missing on server.' };
  }

  const currentPlanConfig = instSettings.plans?.find((p: any) => p.months === data.planMonths) || instSettings.shortPlan || { months: data.planMonths, increase: 20 };
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

  // Step 5: Create the installment and receipt from the SERVER using a transaction
  try {
    const remainingBalance = serverCalculatedTotalAmount - actualPaidNaira;
    const monthlyAmount = remainingBalance / data.planMonths;

    const txResult = await adminDb.runTransaction(async (transaction) => {
      // Re-read pending transaction to ensure it hasn't been completed concurrently
      const txDoc = await transaction.get(pendingTxRef);
      if (!txDoc.exists) {
        throw new Error('Transaction record not found during finalization.');
      }

      const currentTxData = txDoc.data()!;
      if (currentTxData.status === 'completed') {
        return { success: true };
      }

      // Step 6: Check for existing active loans INSIDE the transaction to avoid race conditions
      const existingLoansQuery = adminDb
        .collection('installments')
        .where('userEmail', '==', data.userEmail)
        .where('status', 'in', ['active', 'cancelling']);
      const existingSnap = await transaction.get(existingLoansQuery);

      if (!existingSnap.empty) {
        throw new Error('You already have an active installment plan.');
      }

      const receiptRef = adminDb.collection('receipts').doc();
      const installmentRef = adminDb.collection('installments').doc();

      // Handle Referral Logic if applicable
      let isReturningCustomer = false;
      let previousReferralCode: string | null = null;

      const emailQuery = await transaction.get(adminDb.collection('installments').where('userEmail', '==', data.userEmail).limit(1));
      if (!emailQuery.empty) {
        isReturningCustomer = true;
        previousReferralCode = emailQuery.docs[0].data().referralCode || previousReferralCode;
      } else {
        // Also check normal orders just in case
        const orderEmailQuery = await transaction.get(adminDb.collection('orders').where('email', '==', data.userEmail).limit(1));
        if (!orderEmailQuery.empty) {
          isReturningCustomer = true;
          previousReferralCode = orderEmailQuery.docs[0].data().referralCode || previousReferralCode;
        }
      }

      let finalReferralCode = data.referralCode;
      let partnerCutPercentage = 50;
      // Always get rdpPrice/costPrice from the product document for accurate stats
      let rdpPrice = productDoc.exists ? (productDoc.data()?.rdpPrice || productDoc.data()?.costPrice || 0) : 0;
      let partnerEarnings = 0;

      if (isReturningCustomer && previousReferralCode) {
        finalReferralCode = previousReferralCode;
      }

      if (finalReferralCode) {
        const partnersQuery = await transaction.get(adminDb.collection('partners').where('referralCode', '==', finalReferralCode).where('status', '==', 'approved').limit(1));
        if (partnersQuery.empty) {
          finalReferralCode = null;
        } else {
          const partnerDoc = partnersQuery.docs[0];
          const partnerData = partnerDoc.data();

          if (isReturningCustomer && !partnerData.isVip) {
            finalReferralCode = null;
          } else {
            const settingsDoc = await transaction.get(adminDb.collection('settings').doc('partnership'));
            const settings = settingsDoc.exists ? settingsDoc.data()! : {};

            if (isReturningCustomer && partnerData.isVip) {
              partnerCutPercentage = settings.vipPercentage !== undefined ? settings.vipPercentage : 20;
            } else {
              partnerCutPercentage = settings.globalPercentage !== undefined ? settings.globalPercentage : 50;
            }

            // rdpPrice already populated above from the product document
            const totalProfit = Math.max(0, realProductPrice - rdpPrice);
            partnerEarnings = totalProfit * (partnerCutPercentage / 100);

            // DO NOT update the partner doc here.
            // We just calculate the expected earnings and save it to the installment.
            // The partner will be paid when the final payment is completed.
          }
        }
      }

      transaction.set(receiptRef, {
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

      transaction.set(installmentRef, {
        userId: data.userId,
        userEmail: data.userEmail,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deliveryAddress: 'Pending (To be provided upon completion)',
        productId: data.productId,
        productName: data.productName,
        productCategory: data.productCategory,
        productCollection: foundCollection,
        productImage: data.productImage,
        vendor: productDoc.data()?.vendor || null,
        basePrice: realProductPrice,
        rdpPrice: rdpPrice,
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
        referralCode: finalReferralCode || null,
        partnerCutPercentage: finalReferralCode ? partnerCutPercentage : null,
        partnerExpectedEarnings: finalReferralCode ? partnerEarnings : null,
        partnerPaid: finalReferralCode ? false : null,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Mark pending transaction as completed
      transaction.update(pendingTxRef, {
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
      });

      // Create Admin Notification with template and product image
      const instTemplatesDoc = await adminDb.collection('settings').doc('notification_templates').get();
      const instTemplates = instTemplatesDoc.exists ? instTemplatesDoc.data() || {} : {};
      const userName = data.customerName || data.userEmail || 'a user';
      const instMessage = instTemplates.installmentNotification
        ? instTemplates.installmentNotification.replace(/\{user\}/gi, userName)
        : `A new installment plan was started by ${userName}.`;

      const instNotifRef = adminDb.collection('notifications').doc();
      transaction.set(instNotifRef, {
        type: 'installment',
        title: 'New Installment',
        message: instMessage,
        image: data.productImage || '',
        createdAt: new Date().toISOString(),
        read: false,
        adminRoute: '/ADMIN/INSTALLMENTS',
      });

      return { success: true, data };
    });

    if (txResult.success && txResult.data) {
      sendEmail({
        to: txResult.data.userEmail,
        subject: 'Installment Plan Started - Nomo Store',
        html: `<p>Hi ${txResult.data.customerName},</p><p>Your installment plan for ${txResult.data.productName} has been started successfully.</p><p>Thank you!</p>`
      }).catch(console.error);
    }
    return txResult;
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
  reference: string
): Promise<{ success: boolean; error?: string }> {
  // Step 0: Fetch Pending Transaction
  const pendingTxRef = adminDb.collection('pending_transactions').doc(reference);
  const pendingTxSnap = await pendingTxRef.get();

  if (!pendingTxSnap.exists) {
    return { success: false, error: 'Transaction record not found.' };
  }

  const pendingTx = pendingTxSnap.data()!;

  // Idempotency: If already completed, just return success
  if (pendingTx.status === 'completed') {
    return { success: true };
  }

  const data = pendingTx.data as InstallmentPaymentData;

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

  // Step 5: Process the payment from the SERVER using a transaction
  try {
    return await adminDb.runTransaction(async (transaction) => {
      // Re-read pending transaction to ensure it hasn't been completed concurrently
      const txDoc = await transaction.get(pendingTxRef);
      if (!txDoc.exists) {
        throw new Error('Transaction record not found during finalization.');
      }

      const currentTxData = txDoc.data()!;
      if (currentTxData.status === 'completed') {
        return { success: true };
      }

      // Check partner earnings if this is the final payment
      let partnerDoc: any = null;
      if (data.isLastPayment && loan.referralCode && loan.partnerPaid === false) {
        const partnersQuery = await transaction.get(
          adminDb.collection('partners').where('referralCode', '==', loan.referralCode).limit(1)
        );
        if (!partnersQuery.empty) {
          partnerDoc = partnersQuery.docs[0];
        }
      }

      const updatedPayments = [...loan.payments];

      for (const idx of data.monthsToPay) {
        const receiptRef = adminDb.collection('receipts').doc();
        transaction.set(receiptRef, {
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
        isNew: true,
      };

      if (data.isLastPayment) {
        updateData.status = 'completed';
        updateData.completedAt = new Date().toISOString();
        updateData.shippingMethod =
          data.deliveryMethod === 'pickup' ? 'Office Pickup' : 'Delivery';
        updateData.shippingAddress = data.shippingAddress || '';
        updateData.phone = data.phone || '';

        // Create the order
        const orderRef = adminDb.collection('orders').doc();
        transaction.set(orderRef, {
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
              price: loan.basePrice || loan.totalAmount, // Use basePrice for partner profit calculation
              rdpPrice: loan.rdpPrice || 0, // Include rdpPrice for admin/partnership/page.tsx
              quantity: 1,
              image: loan.productImage,
              vendor: loan.vendor || null,
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
          // Partnership tracking fields for the generated order
          referralCode: loan.referralCode || null,
          partnerCutPercentage: loan.partnerCutPercentage || null,
          partnerPaid: loan.referralCode ? false : null,
        });

        // Deduct product quantity
        const collectionName = loan.productCollection || 'products';
        const productRef = adminDb.collection(collectionName).doc(loan.productId);
        transaction.update(productRef, {
          quantity: FieldValue.increment(-1),
        });

        // 1. Create the global admin notification (seen by CEO and VIP admins)
        const orderNotifRef = adminDb.collection('notifications').doc();
        transaction.set(orderNotifRef, {
          type: 'order',
          title: 'New Order (Installment Completed)',
          message: 'A completed installment has generated a new order.',
          orderId: orderRef.id,
          createdAt: new Date().toISOString(),
          read: false,
          adminRoute: '/ADMIN/ORDERS',
          orderItems: [{
            name: loan.productName || 'Product',
            image: loan.productImage || '',
            quantity: 1,
            price: loan.totalAmount || 0,
          }],
        });

        // 2. Create vendor-specific notification if applicable
        if (loan.vendor) {
          const vendorNotifRef = adminDb.collection('notifications').doc();
          transaction.set(vendorNotifRef, {
            type: 'vendor_order',
            title: 'New Order (Installment Completed)',
            message: 'A completed installment has generated a new order containing your product.',
            orderId: orderRef.id,
            vendorEmail: loan.vendor,
            createdAt: new Date().toISOString(),
            read: false,
            adminRoute: '/ADMIN/ORDERS',
            orderItems: [{
              name: loan.productName || 'Product',
              image: loan.productImage || '',
              quantity: 1,
              price: loan.totalAmount || 0,
            }],
          });
        }

        // Pay the partner if applicable
        if (partnerDoc && loan.partnerExpectedEarnings) {
          transaction.update(partnerDoc.ref, {
            totalEarnings: FieldValue.increment(loan.partnerExpectedEarnings),
            outstandingEarnings: FieldValue.increment(loan.partnerExpectedEarnings),
            referralCount: FieldValue.increment(1),
            lastEarningAt: new Date().toISOString()
          });
          updateData.partnerPaid = true;
        }
      }

      const loanRef = adminDb.collection('installments').doc(data.loanId);
      transaction.update(loanRef, updateData);

      // Mark pending transaction as completed
      transaction.update(pendingTxRef, {
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error processing installment payment:', error);
    return { success: false, error: 'Failed to process payment.' };
  }
}
