'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/data/products';
import { FaTimes, FaCreditCard, FaUser, FaPhone, FaMapMarkerAlt, FaTruck } from 'react-icons/fa';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { usePaystack } from '@/hooks/usePaystack';
import { verifyAndCreateInstallment } from '@/actions/verifyPayment';
import { createPendingTransaction } from '@/actions/pendingTransactions';

interface InstallmentOverlayProps {
  product: Product;
  plan: number;
  onClose: () => void;
}

export default function InstallmentOverlay({ product, plan, onClose }: InstallmentOverlayProps) {
  const [mainImage, setMainImage] = useState(product.images?.[0] || product.image || '');
  const [isFullImageOpen, setIsFullImageOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downPaymentDisplay, setDownPaymentDisplay] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [loanStatus, setLoanStatus] = useState<'checking' | 'none' | 'active' | 'cancelling'>('checking');
  const [instSettings, setInstSettings] = useState<any>(null);
  const router = useRouter();
  const pay = usePaystack();

  // Removed Delivery State
  const [areas, setAreas] = useState<any[]>([]);

  const sanitizeImageUrl = (url: string) => {
    if (!url) return '/images/placeholder.png';
    try {
      if (url.includes('_next/image?url=')) {
        const urlObj = new URL(url.startsWith('http') ? url : `http://localhost${url}`);
        const actualUrl = urlObj.searchParams.get('url');
        if (actualUrl) return actualUrl;
      }
    } catch (e) { }
    return url;
  };

  useEffect(() => {
    // Real-time settings listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'installments'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let plans = data.plans;
        if (!plans || plans.length === 0) {
          plans = [];
          if (data.shortPlan) plans.push(data.shortPlan);
          if (data.longPlan) plans.push(data.longPlan);
        }
        setInstSettings({ ...data, plans });
      } else {
        setInstSettings({
          plans: [
            { months: 3, increase: 20 },
            { months: 4, increase: 30 }
          ],
          shortPlan: { months: 3, increase: 20 },
          longPlan: { months: 4, increase: 30 },
          downpaymentThreshold: 1000000,
          downpaymentUnderThreshold: 30,
          downpaymentOverThreshold: 50,
          deliveryPolicy: "Goods are only delivered at the completion of payment."
        });
      }
    });

    const unsubAreas = onSnapshot(collection(db, 'distribution_areas'), (snap) => {
      setAreas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    if (auth.currentUser?.email) {
      setUserEmail(auth.currentUser.email);
      checkExistingLoan(auth.currentUser.email);
    } else {
      setLoanStatus('none');
    }

    return () => {
      unsubSettings();
      unsubAreas();
    };
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

  const currentPlanConfig = instSettings.plans?.find((p: any) => p.months === plan) || instSettings.shortPlan || { months: plan, increase: 20 };
  const increaseRate = currentPlanConfig.increase / 100;
  const increaseAmount = product.price * increaseRate;

  // Base + Interest
  const totalAmount = product.price + increaseAmount;

  // Down payment rules - based on price threshold
  const applicableRate = product.price >= (instSettings.downpaymentThreshold || 1000000)
    ? (instSettings.downpaymentOverThreshold || 50)
    : (instSettings.downpaymentUnderThreshold || 30);

  const minRequiredDownPayment = Math.ceil(totalAmount * (applicableRate / 100));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatWithCommas = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "";
    return new Intl.NumberFormat().format(parseInt(digits));
  };

  const parseWithCommas = (val: string) => {
    return val.replace(/\D/g, "");
  };

  const processInitialDeposit = async (reference?: any) => {
    const amountToPay = Number(parseWithCommas(downPaymentDisplay));
    setIsProcessing(true);
    try {
      if (!reference?.reference) {
        toast.error('No payment reference found.');
        setIsProcessing(false);
        return;
      }

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

        // Send the reference to the SERVER for verification (which reads from pending_transactions)
        const result = await verifyAndCreateInstallment(reference.reference);

        if (!result.success) {
          toast.error(result.error || 'Payment verification failed.');
          setIsProcessing(false);
          return;
        }

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



  const handleProceed = async () => {
    const amountToPay = Number(parseWithCommas(downPaymentDisplay));

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

    if (!downPaymentDisplay || amountToPay < minRequiredDownPayment) {
      toast.error(`Amount is below minimum down payment. Required: ${formatCurrency(minRequiredDownPayment)}`);
      return;
    }

    setIsProcessing(true);
    const currentUser = auth.currentUser;
    const dataToSave = {
      userId: currentUser?.uid || 'guest',
      userEmail: userEmail || currentUser?.email || '',
      customerName: fullName,
      customerPhone: phone,
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      productCollection: (product as any).collectionName || 'products',
      productImage: product.images?.[0] || product.image || '',
      basePrice: product.price,
      totalAmount: totalAmount,
      downPaymentAmount: amountToPay,
      planMonths: plan,
      lateFeePercent: instSettings.lateFeePercent || 5,
      withdrawalFeePercent: instSettings.withdrawalFeePercent || 15,
      gracePeriodDays: instSettings.gracePeriodDays || 5,
      referralCode: localStorage.getItem('partner_ref_code') || null,
    };

    const res = await createPendingTransaction('installment_deposit', dataToSave);
    if (!res.success || !res.reference) {
      toast.error(res.error || 'Failed to initialize payment');
      setIsProcessing(false);
      return;
    }

    pay({
      reference: res.reference,
      email: userEmail || 'customer@example.com',
      amount: amountToPay * 100,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      onSuccess: processInitialDeposit,
      onClose: () => {
        toast.error('Payment cancelled');
        setIsProcessing(false);
      },
    });
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
          <button onClick={() => router.push('/installments/pay-loan')} className="bg-primary text-white hover:bg-primary-hover font-semibold px-4 py-2 rounded flex-1 transition-colors">Check Plan</button>
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
          <img src="/logo_nomo.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28px] h-[28px]" />
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
            <img 
              src={sanitizeImageUrl(mainImage)} 
              alt={product.name} 
              className="w-full h-full object-cover" 
              onError={(e) => { e.currentTarget.src = '/images/placeholder.png'; }}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded">
            {product.images?.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setMainImage(img)}
                className={`w-[60px] h-[60px] rounded-lg overflow-hidden shrink-0 cursor-pointer border ${mainImage === img ? 'border-2 border-primary' : 'border-border'}`}
              >
                <img 
                  src={sanitizeImageUrl(img)} 
                  alt="" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.currentTarget.src = '/images/placeholder.png'; }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Details Section */}
        <div className="p-5 md:p-8 flex flex-col">
          <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
          <p className="text-muted-foreground mb-6">{product.description}</p>

          <div className="mb-8">
            <div className="flex justify-between mb-2 text-sm">
              <span>Base Price</span>
              <span className="font-bold">{formatCurrency(product.price)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm text-primary">
              <span>{plan}-months Plan Interest ({Math.round(increaseRate * 100)}%)</span>
              <span className="font-bold">+ {formatCurrency(increaseAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border text-xl font-bold">
              <span>Total Plan Cost</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-xs font-bold mb-1">Full Name</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full py-2.5 pr-4 pl-10 rounded-lg border border-border text-sm bg-background outline-none focus:border-primary"
                  required
                />
                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold mb-1">Phone Number</h3>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="080..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full py-2.5 pr-4 pl-10 rounded-lg border border-border text-sm bg-background outline-none focus:border-primary"
                  required
                />
                <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-6">
            <div>
              <h3 className="text-xs font-bold mb-1">Account Email</h3>
              <input
                type="email"
                readOnly
                value={userEmail}
                className="w-full p-2.5 rounded-lg border border-border text-sm bg-muted text-muted-foreground cursor-not-allowed outline-none"
              />
            </div>
          </div>


          {/* Down Payment Section */}
          <div className="mb-8 border-t border-border pt-6">
            <h3 className="font-bold mb-4">Enter Down Payment</h3>

            {downPaymentDisplay && Number(parseWithCommas(downPaymentDisplay)) < minRequiredDownPayment && (
              <p className="text-red-500 text-[0.85rem] mb-2 font-bold animate-[shake_0.3s]">
                ⚠️ Amount is too low. Minimum: {formatCurrency(minRequiredDownPayment)}
              </p>
            )}

            <div className="mb-4">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Required Deposit Plan</p>
              <button
                onClick={() => setDownPaymentDisplay(formatWithCommas(Math.round(minRequiredDownPayment).toString()))}
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
                type="text"
                placeholder={`Minimum ${formatCurrency(minRequiredDownPayment)}`}
                value={downPaymentDisplay}
                onChange={(e) => setDownPaymentDisplay(formatWithCommas(e.target.value))}
                className={`w-full py-4 pr-4 pl-12 rounded-lg border text-base font-bold outline-none ${downPaymentDisplay && Number(parseWithCommas(downPaymentDisplay)) < minRequiredDownPayment ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'}`}
              />
              <FaCreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 ${downPaymentDisplay && Number(parseWithCommas(downPaymentDisplay)) < minRequiredDownPayment ? 'text-red-500' : 'text-primary'}`} />
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
                  <div className="font-bold">{formatCurrency(Number(parseWithCommas(downPaymentDisplay)) || minRequiredDownPayment)}</div>
                </div>
                <span className="text-[0.7rem] bg-white/20 px-2 py-1 rounded-full">Immediate</span>
              </div>

              {/* Installments List */}
              {Array.from({ length: plan }).map((_, i) => {
                const currentPaid = Number(parseWithCommas(downPaymentDisplay)) || minRequiredDownPayment;
                const remaining = totalAmount - currentPaid;
                const dynamicMonthly = remaining / plan;

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
                <FaCreditCard /> Proceed to Pay {downPaymentDisplay ? formatCurrency(Number(parseWithCommas(downPaymentDisplay))) : formatCurrency(minRequiredDownPayment)}
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

