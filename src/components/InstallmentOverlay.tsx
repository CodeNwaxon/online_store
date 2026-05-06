'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/data/products';
import { installmentSettings } from '@/data/installmentSettings';
import { FaTimes, FaCreditCard, } from 'react-icons/fa';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface InstallmentOverlayProps {
  product: Product;
  plan: 3 | 4;
  onClose: () => void;
}

export default function InstallmentOverlay({ product, plan, onClose }: InstallmentOverlayProps) {
  const [mainImage, setMainImage] = useState(product.image);
  const [isFullImageOpen, setIsFullImageOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downPaymentInput, setDownPaymentInput] = useState<number | string>('');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (auth.currentUser?.email) {
      setUserEmail(auth.currentUser.email);
    }
  }, []);

  const increaseRate = plan === 3 ? installmentSettings.threeMonthIncrease : installmentSettings.fourMonthIncrease;
  const increaseAmount = product.price * increaseRate;
  const totalAmount = product.price + increaseAmount;
  const monthlyAmount = totalAmount / plan;

  // Down payment rules
  const downPaymentRate = product.price >= installmentSettings.oneMillionThreshold
    ? installmentSettings.downPaymentOver1M
    : installmentSettings.downPaymentUnder1M;

  const requiredDownPayment = totalAmount * downPaymentRate;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const handleProceed = async () => {
    const amountToPay = Number(downPaymentInput);

    if (!userEmail || !userEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (!downPaymentInput || amountToPay < requiredDownPayment) {
      toast.error(`Amount is below down payment. Minimum required: ${formatCurrency(requiredDownPayment)}`);
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
        // Check for existing active loan
        const q = query(
          collection(db, 'installments'),
          where('userEmail', '==', currentUser.email),
          where('status', '==', 'active')
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          toast.error('You already have an active installment session. Please complete or cancel it first.');
          setIsProcessing(false);
          return;
        }

        // Recalculate future monthly payments if user paid more than minimum
        const remainingBalance = totalAmount - amountToPay;
        const recalculatedMonthlyAmount = remainingBalance / (plan - 1);

        // Create the installment session in Firestore
        await addDoc(collection(db, 'installments'), {
          userId: currentUser.uid,
          userEmail: userEmail || currentUser.email,
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          totalAmount: totalAmount,
          monthlyAmount: recalculatedMonthlyAmount, // Use the reduced amount
          planMonths: plan,
          downPaymentPaid: amountToPay,
          monthsPaid: 1,
          payments: [
            { month: 1, amount: amountToPay, status: 'paid', paidAt: new Date(), deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
            ...Array.from({ length: plan - 1 }).map((_, i) => ({
              month: i + 2,
              amount: recalculatedMonthlyAmount, // Use the reduced amount
              status: 'pending',
              deadline: new Date(Date.now() + (i + 2) * 30 * 24 * 60 * 60 * 1000)
            }))
          ],
          status: 'active',
          createdAt: serverTimestamp(),
        });

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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--background)',
        borderRadius: 'var(--radius)',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--foreground)',
            zIndex: 10
          }}
        >
          <FaTimes size={24} />
        </button>

        {/* Left: Image Section */}
        <div style={{ padding: '2rem', borderRight: '1px solid var(--border)' }}>
          <div
            style={{
              width: '100%',
              aspectRatio: '1',
              backgroundColor: 'var(--muted)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              cursor: 'zoom-in',
              marginBottom: '1rem'
            }}
            onClick={() => setIsFullImageOpen(true)}
          >
            <img src={mainImage} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
            {product.images?.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setMainImage(img)}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: mainImage === img ? '2px solid var(--primary)' : '1px solid var(--border)'
                }}
              >
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Details Section */}
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{product.name}</h2>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>{product.description}</p>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Base Price</span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(product.price)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              <span>Plan Interest ({increaseRate * 100}%)</span>
              <span style={{ fontWeight: 'bold' }}>+ {formatCurrency(increaseAmount)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border)',
              fontSize: '1.25rem',
              fontWeight: 'bold'
            }}>
              <span>Total Plan Cost</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Monthly Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: plan }).map((_, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: 'var(--muted)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: i === 0 ? 'var(--primary)' : 'var(--border)',
                    color: i === 0 ? 'white' : 'var(--muted-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.8rem'
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Month {i + 1}</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(i === 0 ? requiredDownPayment : monthlyAmount)}</div>
                  </div>
                  {i === 0 && <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--primary)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '1rem' }}>Down Payment</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '0.75rem' }}>Email for Payment Receipt</h3>
            <input
              type="email"
              placeholder="Your email address"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Down Payment</h3>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                placeholder={`Minimum ${formatCurrency(requiredDownPayment)}`}
                value={downPaymentInput}
                onChange={(e) => setDownPaymentInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  fontSize: '1rem'
                }}
              />
              <FaCreditCard style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
              * You can pay more than the minimum to reduce your monthly installments.
            </p>
          </div>

          <button
            disabled={isProcessing}
            onClick={handleProceed}
            className="btn btn-primary"
            style={{
              marginTop: 'auto',
              width: '100%',
              padding: '1rem',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}
          >
            {isProcessing ? 'Processing...' : (
              <>
                <FaCreditCard /> Proceed to Pay {downPaymentInput ? formatCurrency(Number(downPaymentInput)) : formatCurrency(requiredDownPayment)}
              </>
            )}
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '1rem' }}>
            Secure payment via Paystack
          </p>
        </div>
      </div>

      {/* Full Image Overlay */}
      {isFullImageOpen && (
        <div
          onClick={() => setIsFullImageOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img src={mainImage} alt="" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}
