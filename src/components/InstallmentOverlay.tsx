'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/data/products';
import { FaTimes, FaCreditCard, FaUser, FaPhone } from 'react-icons/fa';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface InstallmentOverlayProps {
  product: Product;
  plan: number;
  onClose: () => void;
}

export default function InstallmentOverlay({ product, plan, onClose }: InstallmentOverlayProps) {
  const [mainImage, setMainImage] = useState(product.image);
  const [isFullImageOpen, setIsFullImageOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downPaymentInput, setDownPaymentInput] = useState<number | string>('');
  const [userEmail, setUserEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loanStatus, setLoanStatus] = useState<'checking' | 'none' | 'active' | 'cancelling'>('checking');
  const [instSettings, setInstSettings] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      // Fetch settings
      const setSnap = await getDocs(query(collection(db, 'settings'), where('__name__', '==', 'installments')));
      if (!setSnap.empty) {
        setInstSettings(setSnap.docs[0].data());
      } else {
        // Fallback
        setInstSettings({
          shortPlan: { months: 3, increase: 20 },
          longPlan: { months: 4, increase: 30 },
          downpaymentThreshold: 1000000,
          downpaymentUnderThreshold: 30,
          downpaymentOverThreshold: 50,
          deliveryPolicy: "Goods are only delivered at the completion of payment."
        });
      }

      if (auth.currentUser?.email) {
        setUserEmail(auth.currentUser.email);
        await checkExistingLoan(auth.currentUser.email);
      } else {
        setLoanStatus('none');
      }
    };
    init();
  }, []);

  const checkExistingLoan = async (email: string) => {
    const q = query(
      collection(db, 'installments'),
      where('userEmail', '==', email),
      where('status', 'in', ['active', 'cancelling'])
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      setLoanStatus('none');
    } else {
      const status = snap.docs[0].data().status;
      setLoanStatus(status === 'active' ? 'active' : 'cancelling');
    }
  };

  if (!instSettings) return (
    <div className="fixed inset-0 bg-black/85 z-[1000] flex items-center justify-center p-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const currentPlanConfig = plan === instSettings.shortPlan.months ? instSettings.shortPlan : instSettings.longPlan;
  const increaseRate = currentPlanConfig.increase / 100;
  const increaseAmount = product.price * increaseRate;
  const totalAmount = product.price + increaseAmount;

  // Down payment rules - based on price threshold
  const applicableRate = product.price >= (instSettings.downpaymentThreshold || 1000000) 
    ? (instSettings.downpaymentOverThreshold || 50) 
    : (instSettings.downpaymentUnderThreshold || 30);
    
  const minRequiredDownPayment = totalAmount * (applicableRate / 100);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const handleProceed = async () => {
    const amountToPay = Number(downPaymentInput);

    if (!fullName || fullName.length < 3) {
      toast.error('Please enter your full name.');
      return;
    }
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number.');
      return;
    }
    if (!userEmail || !userEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (!downPaymentInput || amountToPay < minRequiredDownPayment) {
      toast.error(`Amount is below minimum down payment. Required: ${formatCurrency(minRequiredDownPayment)}`);
      return;
    }

    setIsProcessing(true);
    try {
      let currentUser = auth.currentUser;

      if (!currentUser) {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
      }

      if (currentUser) {
        const q = query(
          collection(db, 'installments'),
          where('userEmail', '==', currentUser.email),
          where('status', 'in', ['active', 'cancelling'])
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const existingStatus = querySnapshot.docs[0].data().status;
          if (existingStatus === 'active') {
            router.push('/installments/pay-loan');
          } else {
            setLoanStatus('cancelling');
          }
          setIsProcessing(false);
          return;
        }

        const remainingBalance = totalAmount - amountToPay;
        const recalculatedMonthlyAmount = remainingBalance / plan;

        const receiptRef = await addDoc(collection(db, 'receipts'), {
          userId: currentUser.uid,
          userEmail: userEmail || currentUser.email,
          productName: product.name,
          paymentName: 'Initial Deposit',
          amount: amountToPay,
          createdAt: serverTimestamp(),
          installmentId: '',
        });

          const installmentRef = await addDoc(collection(db, 'installments'), {
            userId: currentUser.uid,
            userEmail: userEmail || currentUser.email,
            customerName: fullName,
            customerPhone: phone,
            productId: product.id,
            productName: product.name,
          productCategory: product.category,
          productImage: product.image,
          shippingFee: product.shipping,
          totalAmount: totalAmount,
          monthlyAmount: recalculatedMonthlyAmount,
          planMonths: plan,
          downPaymentPaid: amountToPay,
          totalAmountPaid: amountToPay,
          monthsPaid: 1,
          payments: [
            {
              month: 1,
              amount: amountToPay,
              status: 'paid',
              paidAt: new Date(),
              deadline: new Date(),
              receiptId: receiptRef.id
            },
            ...Array.from({ length: plan }).map((_, i) => ({
              month: i + 2,
              amount: recalculatedMonthlyAmount,
              status: 'pending',
              deadline: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000)
            }))
          ],
          status: 'active',
          createdAt: serverTimestamp(),
        });

        await updateDoc(receiptRef, { installmentId: installmentRef.id });

        toast.success('Initial payment successful! Loan session created.');
        router.push('/installments/pay-loan');
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const Backdrop = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-black/85 z-[1000] flex items-center justify-center p-4">
      {children}
    </div>
  );

  if (loanStatus === 'checking') return (
    <Backdrop>
      <div className="text-center text-white">
        <div className="w-[50px] h-[50px] border-4 border-white/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/70">Checking your account status...</p>
      </div>
    </Backdrop>
  );

  if (loanStatus === 'active') return (
    <Backdrop>
      <div className="bg-background rounded-[var(--radius)] p-10 max-w-[420px] text-center w-full">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="font-bold text-2xl mb-3">Active Plan Detected</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          You already have an active installment plan running. You must complete or cancel your current plan before starting a new one.
        </p>
        <div className="flex gap-4">
          <button onClick={onClose} className="border border-border text-foreground hover:bg-muted font-semibold px-4 py-2 rounded flex-1 transition-colors">Close</button>
          <button onClick={() => router.push('/installments/pay-loan')} className="bg-primary text-white hover:bg-primary-hover font-semibold px-4 py-2 rounded flex-1 transition-colors">Go to My Plan</button>
        </div>
      </div>
    </Backdrop>
  );

  if (loanStatus === 'cancelling') return (
    <Backdrop>
      <div className="bg-background rounded-[var(--radius)] p-10 max-w-[420px] text-center w-full">
        <div className="w-[60px] h-[60px] relative mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-muted rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
          <img src="/logos.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28px] h-[28px]" />
        </div>
        <h2 className="font-bold text-2xl mb-3">Refund Pending Clearance</h2>
        <p className="text-muted-foreground mb-3 leading-relaxed">
          Your previous plan cancellation is being processed by our admin team. You can only start a new plan once your refund has been fully cleared.
        </p>
        <p className="text-xs text-muted-foreground mb-8">
          Please check back shortly or visit the office for assistance.
        </p>
        <div className="flex gap-4">
          <button onClick={onClose} className="border border-border text-foreground hover:bg-muted font-semibold px-4 py-2 rounded flex-1 transition-colors">Close</button>
          <button onClick={() => router.push('/installments/pay-loan')} className="bg-primary text-white hover:bg-primary-hover font-semibold px-4 py-2 rounded flex-1 transition-colors">Track Refund</button>
        </div>
      </div>
    </Backdrop>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-1">
      <div className="bg-background rounded-[var(--radius)] w-full max-w-[1000px] max-h-[90vh] overflow-y-auto relative grid grid-cols-1 md:grid-cols-2 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-none border-none cursor-pointer text-foreground z-10 p-1"
        >
          <FaTimes size={24} />
        </button>

        {/* Left: Image Section */}
        <div className="p-5 md:p-8 border-b md:border-b-0 md:border-r border-border">
          <div
            className="w-full aspect-square bg-muted rounded-[var(--radius)] overflow-hidden cursor-zoom-in mb-4 relative"
            onClick={() => setIsFullImageOpen(true)}
          >
            <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded">
            {product.images?.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setMainImage(img)}
                className={`w-[60px] h-[60px] rounded-lg overflow-hidden shrink-0 cursor-pointer border ${mainImage === img ? 'border-2 border-primary' : 'border-border'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Details Section */}
        <div className="p-5 md:p-8 flex flex-col">
          <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
          <p className="text-muted-foreground mb-6">{product.description}</p>

          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span>Base Price</span>
              <span className="font-bold">{formatCurrency(product.price)}</span>
            </div>
            <div className="flex justify-between mb-2 text-primary">
              <span>Plan Interest ({increaseRate * 100}%)</span>
              <span className="font-bold">+ {formatCurrency(increaseAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border text-xl font-bold">
              <span>Total Plan Cost</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-bold mb-2">Full Name</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full py-3 pr-4 pl-10 rounded-lg border border-border text-sm bg-background outline-none focus:border-primary"
                  required
                />
                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-2">Phone Number</h3>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="080... or +234..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full py-3 pr-4 pl-10 rounded-lg border border-border text-sm bg-background outline-none focus:border-primary"
                  required
                />
                <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              </div>
            </div>
          </div>

          {/* Email Section */}
          <div className="mb-6">
            <h3 className="font-bold mb-2">Account Email</h3>
            <input
              type="email"
              readOnly
              value={userEmail}
              className="w-full p-3 rounded-lg border border-border text-sm bg-muted text-muted-foreground cursor-not-allowed outline-none"
            />
            <p className="text-[0.65rem] text-muted-foreground mt-1">
              * Linked to your account for receipts and tracking.
            </p>
          </div>

          {/* Down Payment Section */}
          <div className="mb-8">
            <h3 className="font-bold mb-4">Enter Down Payment</h3>

            {downPaymentInput && Number(downPaymentInput) < minRequiredDownPayment && (
              <p className="text-red-500 text-[0.85rem] mb-2 font-bold animate-[shake_0.3s]">
                ⚠️ Amount is too low. Minimum: {formatCurrency(minRequiredDownPayment)}
              </p>
            )}

            <div className="mb-4">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Required Deposit Plan</p>
              <button
                onClick={() => setDownPaymentInput(Math.round(minRequiredDownPayment))}
                className={`w-full py-3 rounded border text-xs font-bold transition-all bg-primary text-white border-primary`}
              >
                Apply {applicableRate}% Deposit ({formatCurrency(minRequiredDownPayment)})
              </button>
              <p className="text-[9px] text-muted-foreground mt-1 text-center italic">
                {product.price >= instSettings.downpaymentThreshold 
                  ? `* High-value items (above ₦${instSettings.downpaymentThreshold.toLocaleString()}) require a ${applicableRate}% minimum deposit.`
                  : `* Items below ₦${instSettings.downpaymentThreshold.toLocaleString()} require a ${applicableRate}% minimum deposit.`
                }
              </p>
            </div>

            <div className="relative">
              <input
                type="number"
                placeholder={`Minimum ${formatCurrency(minRequiredDownPayment)}`}
                value={downPaymentInput}
                onChange={(e) => setDownPaymentInput(e.target.value)}
                className={`w-full py-4 pr-4 pl-12 rounded-lg border text-base font-bold outline-none ${downPaymentInput && Number(downPaymentInput) < minRequiredDownPayment ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'}`}
              />
              <FaCreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 ${downPaymentInput && Number(downPaymentInput) < minRequiredDownPayment ? 'text-red-500' : 'text-primary'}`} />
            </div>
            <p className="text-[0.75rem] text-muted-foreground mt-2">
              * You can pay more than the minimum to reduce your future monthly payments.
            </p>
          </div>

          {/* Monthly Breakdown */}
          <div className="mb-8">
            <h3 className="font-bold mb-4">Payment Breakdown</h3>
            <div className="flex flex-col gap-3">
              {/* Actual Down Payment Block */}
              <div className="flex items-center gap-4 p-4 bg-primary text-white rounded-[var(--radius)] border border-primary">
                <div className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  P
                </div>
                <div className="flex-1">
                  <div className="text-xs opacity-90">Pay Now (Deposit)</div>
                  <div className="font-bold">{formatCurrency(Number(downPaymentInput) || minRequiredDownPayment)}</div>
                </div>
                <span className="text-[0.7rem] bg-white/20 px-2 py-1 rounded-full">Immediate</span>
              </div>

              {/* Installments List */}
              {Array.from({ length: plan - 1 }).map((_, i) => {
                const currentPaid = Number(downPaymentInput) || minRequiredDownPayment;
                const remaining = totalAmount - currentPaid;
                const dynamicMonthly = remaining / (plan - 1);

                return (
                  <div key={i} className="flex items-center gap-4 p-4 bg-muted rounded-[var(--radius)] border border-border">
                    <div className="w-8 h-8 rounded-full bg-border text-muted-foreground flex items-center justify-center font-bold text-sm shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Month {i + 1} Payment</div>
                      <div className="font-bold">{formatCurrency(dynamicMonthly)}</div>
                    </div>
                    <span className="text-[0.7rem] text-muted-foreground">Scheduled</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            disabled={isProcessing}
            onClick={handleProceed}
            className="bg-primary hover:bg-primary-hover text-white disabled:opacity-50 disabled:cursor-not-allowed mt-auto w-full p-4 text-lg flex items-center justify-center gap-3 rounded-lg font-bold transition-colors"
          >
            {isProcessing ? 'Processing...' : (
              <>
                <FaCreditCard /> Proceed to Pay {downPaymentInput ? formatCurrency(Number(downPaymentInput)) : formatCurrency(minRequiredDownPayment)}
              </>
            )}
          </button>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Secure payment via Paystack
          </p>
        </div>
      </div>

      {/* Full Image Overlay */}
      {isFullImageOpen && (
        <div
          onClick={() => setIsFullImageOpen(false)}
          className="fixed inset-0 bg-black/95 z-[1100] flex items-center justify-center cursor-zoom-out p-4"
        >
          <img src={mainImage} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
