'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { products } from '@/data/products';
import { FaCreditCard, FaTruck, FaStore, FaLock, FaChevronLeft } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';

function LoanCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loanId = searchParams.get('loanId');
  const monthsToPay = searchParams.get('months')?.split(',').map(Number) || [];

  const [loan, setLoan] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [isOfficePickup, setIsOfficePickup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Address fields for last payment
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (loanId) fetchLoan();
  }, [loanId]);

  const fetchLoan = async () => {
    const docRef = doc(db, 'installments', loanId!);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setLoan({ id: docSnap.id, ...data });
      const p = products.find(prod => prod.id === data.productId);
      setProduct(p);
    }
    setLoading(false);
  };

  const isLastPayment = loan && (loan.monthsPaid + monthsToPay.length >= loan.planMonths);
  const baseAmount = loan ? monthsToPay.reduce((sum: number, idx: number) => sum + loan.payments[idx].amount, 0) : 0;
  const shippingFee = (product && !isOfficePickup && isLastPayment) ? product.shipping : 0;
  const totalAmount = baseAmount + shippingFee;

  const handleFinalPayment = async () => {
    if (isLastPayment && !isOfficePickup && !address) {
      toast.error('Please provide a shipping address.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const updatedPayments = [...loan.payments];
      const receiptIds: string[] = [];

      // Create receipts for each month being paid
      for (const idx of monthsToPay) {
        const receiptRef = await addDoc(collection(db, 'receipts'), {
          userId: loan.userId,
          userEmail: loan.userEmail,
          productName: loan.productName,
          paymentName: `Month ${loan.payments[idx].month - 1}`,
          amount: loan.payments[idx].amount,
          createdAt: new Date(),
          installmentId: loan.id
        });
        
        updatedPayments[idx].status = 'paid';
        updatedPayments[idx].paidAt = new Date();
        updatedPayments[idx].receiptId = receiptRef.id;
      }

      const loanRef = doc(db, 'installments', loan.id);
      const newTotalPaid = (loan.totalAmountPaid || loan.downPaymentPaid || 0) + baseAmount;
      const updateData: any = {
        payments: updatedPayments,
        monthsPaid: loan.monthsPaid + monthsToPay.length,
        totalAmountPaid: newTotalPaid,   // running total paid underground
      };

      if (isLastPayment) {
        updateData.status = 'completed';
        updateData.shippingMethod = isOfficePickup ? 'Office Pickup' : 'Delivery';
        updateData.shippingAddress = address;
        updateData.phone = phone;
      }

      await updateDoc(loanRef, updateData);
      toast.success('Payment successful!');
      router.push('/installments/pay-loan');
    } catch (error) {
      toast.error('Payment failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (loading) return <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-16">Loading payment details...</div>;
  if (!loan) return <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-16">Loan not found.</div>;

  return (
    <div className="py-16 bg-muted min-h-screen">
      <div className="max-w-[800px] mx-auto px-4 md:px-6">
        <Toaster position="top-center" />
        
        <Link href="/installments/pay-loan" className="flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors w-fit">
          <FaChevronLeft /> Back to Loan Tracking
        </Link>

        <h1 className="text-3xl font-bold mb-8 text-center">Secure Payment</h1>

        <div className="grid grid-cols-1 gap-8">
          {/* Order Summary */}
          <div className="bg-card p-8 rounded-[var(--radius)] border border-border shadow-sm">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
              <FaLock size={16} /> Payment Summary
            </h3>
            
            <div className="flex gap-4 mb-6 items-center">
              <img src={loan.productImage} className="w-20 h-20 rounded-lg object-cover" />
              <div>
                <div className="font-bold">{loan.productName}</div>
                <div className="text-sm text-muted-foreground">
                  Paying for: {monthsToPay.map(idx => `Month ${loan.payments[idx].month}`).join(', ')}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex flex-col gap-3">
              <div className="flex justify-between">
                <span>Installment Amount</span>
                <span>{formatCurrency(baseAmount)}</span>
              </div>
              
              {isLastPayment && (
                <>
                  <div className="flex justify-between text-primary">
                    <span className="flex items-center gap-2"><FaTruck /> Shipping Fee</span>
                    <span>{isOfficePickup ? 'FREE' : formatCurrency(shippingFee)}</span>
                  </div>

                  <div className="flex gap-4 mt-2">
                    <button 
                      onClick={() => setIsOfficePickup(false)}
                      className={`flex-1 p-4 rounded-lg flex flex-col items-center gap-2 cursor-pointer transition-colors ${!isOfficePickup ? 'border-2 border-primary bg-primary/5' : 'border border-border bg-card hover:bg-muted'}`}
                    >
                      <FaTruck size={20} color={!isOfficePickup ? 'var(--primary)' : '#666'} />
                      <span className="text-sm font-bold">Home Delivery</span>
                    </button>
                    <button 
                      onClick={() => setIsOfficePickup(true)}
                      className={`flex-1 p-4 rounded-lg flex flex-col items-center gap-2 cursor-pointer transition-colors ${isOfficePickup ? 'border-2 border-primary bg-primary/5' : 'border border-border bg-card hover:bg-muted'}`}
                    >
                      <FaStore size={20} color={isOfficePickup ? 'var(--primary)' : '#666'} />
                      <span className="text-sm font-bold">Office Pick Up</span>
                    </button>
                  </div>
                </>
              )}

              <div className="flex justify-between text-xl font-bold mt-4 border-t-2 border-border pt-4">
                <span>Total to Pay</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Details (Last Payment Only) */}
          {isLastPayment && !isOfficePickup && (
            <div className="bg-card p-8 rounded-[var(--radius)] border border-border shadow-sm">
              <h3 className="font-bold text-xl mb-6">Shipping Information</h3>
              <div className="flex flex-col gap-4">
                <input 
                  type="text" 
                  placeholder="Full Delivery Address" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-4 rounded-lg border border-border bg-background outline-none focus:border-primary transition-colors"
                />
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-4 rounded-lg border border-border bg-background outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          )}

          {/* Card Form Mockup */}
          <div className="bg-card p-8 rounded-[var(--radius)] border border-border shadow-sm">
             <h3 className="font-bold text-xl mb-6">Card Information</h3>
             <div className="flex flex-col gap-4">
                <input type="text" placeholder="Card Number" className="w-full p-4 rounded-lg border border-border bg-background" disabled />
                <div className="flex gap-4">
                  <input type="text" placeholder="MM/YY" className="flex-1 p-4 rounded-lg border border-border bg-background" disabled />
                  <input type="text" placeholder="CVV" className="flex-1 p-4 rounded-lg border border-border bg-background" disabled />
                </div>
             </div>
             
             <button 
              disabled={isProcessing}
              onClick={handleFinalPayment}
              className="w-full bg-primary hover:bg-primary-hover text-white mt-8 p-4 text-lg rounded-md font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
             >
               {isProcessing ? 'Processing Securely...' : `Pay ${formatCurrency(totalAmount)}`}
             </button>
             <p className="text-center text-xs text-muted-foreground mt-4">
               Payments are processed securely via Paystack.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoanCheckout() {
  return (
    <Suspense fallback={<div className="max-w-[1200px] mx-auto px-4 md:px-6 py-16">Loading...</div>}>
      <LoanCheckoutContent />
    </Suspense>
  );
}
