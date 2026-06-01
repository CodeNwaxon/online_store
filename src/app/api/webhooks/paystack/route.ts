import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebaseAdmin';
import { 
  verifyAndFulfillOrder, 
  verifyAndCreateInstallment, 
  verifyAndProcessInstallmentPayment 
} from '@/actions/verifyPayment';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      console.error('PAYSTACK_SECRET_KEY is missing.');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Validate signature
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    if (payload.event === 'charge.success') {
      const reference = payload.data.reference;
      
      // Look up the pending transaction to know how to process it
      const pendingTxSnap = await adminDb.collection('pending_transactions').doc(reference).get();
      
      if (!pendingTxSnap.exists) {
        console.error(`Received webhook for unknown reference: ${reference}`);
        return NextResponse.json({ received: true }); // Acknowledge anyway so Paystack doesn't retry
      }

      const pendingTx = pendingTxSnap.data()!;

      // Idempotency check: Don't process if already completed by the client callback
      if (pendingTx.status === 'completed') {
        console.log(`Webhook ignored: reference ${reference} already completed.`);
        return NextResponse.json({ received: true });
      }

      console.log(`Processing webhook for reference ${reference} of type ${pendingTx.type}`);

      let result;
      switch (pendingTx.type) {
        case 'checkout':
          result = await verifyAndFulfillOrder(reference);
          break;
        case 'installment_deposit':
          result = await verifyAndCreateInstallment(reference);
          break;
        case 'installment_repayment':
          result = await verifyAndProcessInstallmentPayment(reference);
          break;
        default:
          console.error(`Unknown transaction type: ${pendingTx.type}`);
          return NextResponse.json({ received: true });
      }

      if (!result.success) {
        console.error(`Failed to process webhook for reference ${reference}: ${result.error}`);
        // We still return 200 to Paystack so it doesn't keep retrying if it's an internal logical error
      } else {
        console.log(`Successfully processed webhook for reference ${reference}`);
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
