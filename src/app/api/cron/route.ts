import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/sendEmail';

export async function GET(request: Request) {
  try {
    // Security check: Verify Authorization header against CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    // 1. Process Abandoned Carts (Pending Transactions)
    const pendingSnap = await adminDb.collection('pending_transactions')
      .where('status', '==', 'pending')
      .get();
    
    const now = new Date().getTime();
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    const emailsToSend: Promise<any>[] = [];

    pendingSnap.forEach((doc) => {
      const tx = doc.data();
      const txData = tx.data || {};
      
      // We only want to send cart reminders for 'checkout' transactions (not installments)
      if (tx.type !== 'checkout') return;

      // We need a createdAt timestamp
      let txDate = now;
      if (tx.createdAt) {
         txDate = tx.createdAt.toDate ? tx.createdAt.toDate().getTime() : new Date(tx.createdAt).getTime();
      }
      
      const timeDiff = now - txDate;
      const customerEmail = txData.email || txData.userEmail;

      if (!customerEmail) return;

      const reminders = tx.reminders || {};

      if (timeDiff >= THIRTY_DAYS && !reminders.thirtyDay) {
        emailsToSend.push(
          sendEmail({
            to: customerEmail,
            subject: 'Your Cart is Waiting! 🛒 (1 Month Reminder)',
            html: `<p>Hi ${txData.customerName || 'there'},</p><p>You left some items pending in your cart a month ago! Don't miss out on these great products.</p><p>Please log in to complete your checkout.</p>`
          }).then(() => adminDb.collection('pending_transactions').doc(doc.id).update({ 'reminders.thirtyDay': true }))
        );
      } else if (timeDiff >= SEVEN_DAYS && !reminders.sevenDay && timeDiff < THIRTY_DAYS) {
        emailsToSend.push(
          sendEmail({
            to: customerEmail,
            subject: 'Don\'t forget your pending items! (1 Week Reminder)',
            html: `<p>Hi ${txData.customerName || 'there'},</p><p>It's been a week! Your cart is still pending.</p><p>Log in now to secure your items before they sell out.</p>`
          }).then(() => adminDb.collection('pending_transactions').doc(doc.id).update({ 'reminders.sevenDay': true }))
        );
      } else if (timeDiff >= THREE_DAYS && !reminders.threeDay && timeDiff < SEVEN_DAYS) {
         emailsToSend.push(
          sendEmail({
            to: customerEmail,
            subject: 'Action Required: Pending Items in Cart',
            html: `<p>Hi ${txData.customerName || 'there'},</p><p>We noticed you have items pending in your cart for the past 3 days.</p><p>Visit our store to complete your purchase!</p>`
          }).then(() => adminDb.collection('pending_transactions').doc(doc.id).update({ 'reminders.threeDay': true }))
        );
      }
    });

    // 2. Process Vendor Low Stock
    const collections = ['products', 'foods', 'wears', 'cosmetics', 'toilet_kitchen'];
    const vendorStock: Record<string, number> = {};

    for (const colName of collections) {
      const snap = await adminDb.collection(colName).get();
      snap.forEach(doc => {
        const item = doc.data();
        if (item.vendor) {
          const totalQty = (item.quantity ?? 0) + (item.sizeQuantities ? Object.values(item.sizeQuantities).reduce((a: any, b: any) => a + (parseInt(b) || 0), 0) : 0);
          
          if (totalQty <= 10) {
             vendorStock[item.vendor] = (vendorStock[item.vendor] || 0) + 1;
          }
        }
      });
    }

    const lastStockReminderSnap = await adminDb.collection('system_config').doc('last_stock_reminders').get();
    const lastStockReminders = lastStockReminderSnap.exists ? lastStockReminderSnap.data() || {} : {};

    for (const [vendorEmail, lowStockCount] of Object.entries(vendorStock)) {
      if (lowStockCount > 0) {
         const lastReminder = lastStockReminders[vendorEmail] || 0;
         // Send if more than 30 days have passed since last reminder
         if (now - lastReminder >= THIRTY_DAYS) {
           emailsToSend.push(
             sendEmail({
               to: vendorEmail,
               subject: 'Monthly Stock Alert: Low Inventory',
               html: `<p>Hello Vendor,</p><p>You currently have <strong>${lowStockCount}</strong> items with low stock (10 or fewer remaining).</p><p>Please log into your vendor dashboard to restock these items soon!</p>`
             }).then(() => {
                lastStockReminders[vendorEmail] = now;
             })
           );
         }
      }
    }

    // 3. Process Installments (Late Warnings & Penalties)
    const installmentsSnap = await adminDb.collection('installments')
      .where('status', '==', 'active')
      .get();
    
    installmentsSnap.forEach((doc) => {
      const loan = doc.data();
      // Find the earliest pending payment
      const pendingPayment = loan.payments?.find((p: any) => p.status === 'pending');
      if (!pendingPayment || !pendingPayment.deadline) return;

      const deadline = new Date(pendingPayment.deadline).getTime();
      const timeDiff = now - deadline;
      
      // If deadline hasn't passed, do nothing
      if (timeDiff <= 0) return;

      const daysLate = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const customerEmail = loan.userEmail || loan.email;
      if (!customerEmail) return;
      
      const lateFlags = loan.lateFlags || {};
      const lateFeePercent = loan.lateFeePercent || 5;

      if (daysLate >= 1 && daysLate <= 5) {
        // Daily warning for first 5 days
        const flagKey = `day${daysLate}`;
        if (!lateFlags[flagKey]) {
          const daysLeft = 6 - daysLate; // 5, 4, 3, 2, 1
          const msg = `You have ${daysLeft} day${daysLeft > 1 ? 's' : ''} of grace period remaining before a ${lateFeePercent}% late fee penalty is applied.`;
          
          emailsToSend.push(
            sendEmail({
              to: customerEmail,
              subject: `Urgent: Installment Payment Overdue (${daysLeft} day${daysLeft > 1 ? 's' : ''} grace left)`,
              html: `<p>Hi ${loan.customerName || 'there'},</p>
              <p>Your installment payment of ₦${pendingPayment.amount.toLocaleString()} for <strong>${loan.productName}</strong> was due on ${new Date(deadline).toDateString()}.</p>
              <p>${msg}</p>
              <p>Please log into your dashboard and make the payment immediately to avoid extra charges.</p>`
            }).then(() => adminDb.collection('installments').doc(doc.id).update({ [`lateFlags.${flagKey}`]: true }))
          );

          if (loan.userId) {
            emailsToSend.push(
              adminDb.collection('broadcasts').add({
                title: 'Installment Overdue',
                message: msg,
                type: 'delivery', // using delivery maps to personal notification
                customerUid: loan.userId,
                createdAt: new Date().toISOString()
              })
            );
          }
        }
      } else if (daysLate >= 6) {
        // Day 6 penalty application + Monthly reminders
        if (!lateFlags.penaltyApplied) {
          // Apply penalty
          const remainingBalance = loan.totalAmount - (loan.totalAmountPaid || loan.downPaymentPaid || 0);
          const penaltyAmount = remainingBalance * (lateFeePercent / 100);
          const newTotalAmount = loan.totalAmount + penaltyAmount;
          
          const remainingMonths = loan.planMonths - loan.monthsPaid;
          const newMonthlyPayment = (remainingBalance + penaltyAmount) / remainingMonths;
          
          // Update future pending payments
          const updatedPayments = loan.payments.map((p: any) => {
            if (p.status === 'pending') {
              return { ...p, amount: newMonthlyPayment };
            }
            return p;
          });

          const updateObj = {
            'lateFlags.penaltyApplied': true,
            'lateFlags.lastPenaltyReminder': now,
            totalAmount: newTotalAmount,
            monthlyAmount: newMonthlyPayment,
            payments: updatedPayments
          };

          const msg = `Your grace period has expired. A ${lateFeePercent}% late fee has been applied. Your new monthly payment is ₦${newMonthlyPayment.toLocaleString()}.`;

          emailsToSend.push(
            sendEmail({
              to: customerEmail,
              subject: `Notice: Late Fee Penalty Applied for ${loan.productName}`,
              html: `<p>Hi ${loan.customerName || 'there'},</p>
              <p>Your grace period has expired for your overdue installment payment.</p>
              <p>As per our terms, a <strong>${lateFeePercent}% late fee</strong> has been applied to your remaining balance.</p>
              <p>Your new monthly payment has increased from ₦${loan.monthlyAmount.toLocaleString()} to <strong>₦${newMonthlyPayment.toLocaleString()}</strong>.</p>
              <p>Please log into your dashboard and make the payment as soon as possible.</p>`
            }).then(() => adminDb.collection('installments').doc(doc.id).update(updateObj))
          );

          if (loan.userId) {
            emailsToSend.push(
              adminDb.collection('broadcasts').add({
                title: 'Late Fee Applied',
                message: msg,
                type: 'delivery',
                customerUid: loan.userId,
                createdAt: new Date().toISOString()
              })
            );
          }
        } else {
          // It's been applied. Check if we need to send a monthly reminder (every 30 days)
          const lastReminder = lateFlags.lastPenaltyReminder || 0;
          if (now - lastReminder >= THIRTY_DAYS) {
            emailsToSend.push(
              sendEmail({
                to: customerEmail,
                subject: `Reminder: Overdue Installment Payment for ${loan.productName}`,
                html: `<p>Hi ${loan.customerName || 'there'},</p>
                <p>This is a monthly reminder that your installment payment is severely overdue.</p>
                <p>Your current monthly payment is <strong>₦${loan.monthlyAmount.toLocaleString()}</strong> (includes late fees).</p>
                <p>Please settle this immediately.</p>`
              }).then(() => adminDb.collection('installments').doc(doc.id).update({ 'lateFlags.lastPenaltyReminder': now }))
            );

            if (loan.userId) {
              emailsToSend.push(
                adminDb.collection('broadcasts').add({
                  title: 'Overdue Payment Reminder',
                  message: `Your installment payment is severely overdue. Current monthly payment: ₦${loan.monthlyAmount.toLocaleString()}`,
                  type: 'delivery',
                  customerUid: loan.userId,
                  createdAt: new Date().toISOString()
                })
              );
            }
          }
        }
      }
    });

    await Promise.all(emailsToSend);
    
    // Save updated reminder times
    await adminDb.collection('system_config').doc('last_stock_reminders').set(lastStockReminders, { merge: true });

    // 4. Delete old notifications and broadcasts (older than 6 months)
    const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000);
    const collectionsToClean = ['notifications', 'broadcasts'];
    let deletedCount = 0;

    for (const collName of collectionsToClean) {
      const oldSnap = await adminDb.collection(collName).get();
      
      if (!oldSnap.empty) {
        let currentBatch = adminDb.batch();
        let batchSize = 0;

        for (const doc of oldSnap.docs) {
          const data = doc.data();
          if (data.createdAt) {
            const createdAt = new Date(data.createdAt).getTime();
            if (createdAt < sixMonthsAgo) {
              currentBatch.delete(doc.ref);
              deletedCount++;
              batchSize++;

              // Commit in chunks of 450 to avoid Firestore 500 limit
              if (batchSize >= 450) {
                await currentBatch.commit();
                currentBatch = adminDb.batch();
                batchSize = 0;
              }
            }
          }
        }
        
        if (batchSize > 0) {
          await currentBatch.commit();
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} old notifications/broadcasts`);
    }

    return NextResponse.json({ success: true, message: 'Cron job executed successfully', emailsSent: emailsToSend.length, notificationsDeleted: deletedCount });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: 'Failed to process cron job' }, { status: 500 });
  }
}
