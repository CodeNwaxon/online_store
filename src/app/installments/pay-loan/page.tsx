'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { installmentSettings } from '@/data/installmentSettings';
import { FaCalendarAlt, FaCheckCircle, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function PayLoanPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loan, setLoan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchLoan(currentUser.email!);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchLoan = async (email: string) => {
    const q = query(
      collection(db, 'installments'),
      where('userEmail', '==', email),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      setLoan({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
    } else {
      setLoan(null);
    }
    setLoading(false);
  };

  const handlePayMonth = async (monthIndex: number) => {
    // Sequential check: Can only pay if previous months are paid
    for (let i = 0; i < monthIndex; i++) {
      if (loan.payments[i].status !== 'paid') {
        toast.error(`Please pay Month ${i + 1} first.`);
        return;
      }
    }

    try {
      const updatedPayments = [...loan.payments];
      updatedPayments[monthIndex].status = 'paid';
      updatedPayments[monthIndex].paidAt = new Date();

      const loanRef = doc(db, 'installments', loan.id);
      await updateDoc(loanRef, {
        payments: updatedPayments,
        monthsPaid: loan.monthsPaid + 1
      });

      toast.success(`Month ${monthIndex + 1} payment successful!`);
      await fetchLoan(user?.email!);
    } catch (error) {
      toast.error('Payment failed. Try again.');
    }
  };

  const handleCancelPlan = async () => {
    try {
      const totalPaid = loan.payments
        .filter((p: any) => p.status === 'paid')
        .reduce((sum: number, p: any) => sum + p.amount, 0);
      
      const charge = totalPaid * installmentSettings.cancellationFee;
      const refund = totalPaid - charge;

      // In a real app, you'd process the refund here
      
      await deleteDoc(doc(db, 'installments', loan.id));
      toast.success(`Plan cancelled. Refund of ${formatCurrency(refund)} processed (after ${installmentSettings.cancellationFee * 100}% fee).`);
      router.push('/installments');
    } catch (error) {
      toast.error('Failed to cancel plan.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const isExpired = (deadline: any) => {
    const d = deadline.toDate ? deadline.toDate() : new Date(deadline);
    return new Date() > d;
  };

  const getDeadlineDiff = (deadline: any) => {
    const d = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const diffTime = d.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div className="container section">Loading your loan status...</div>;

  if (!user) return (
    <div className="container section" style={{ textAlign: 'center' }}>
      <h2>Please sign in to view your loans.</h2>
      <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => router.push('/installments')}>Go to Installments</button>
    </div>
  );

  if (!loan) return (
    <div className="container section" style={{ textAlign: 'center' }}>
      <h2>No active installment plans found.</h2>
      <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => router.push('/installments')}>Start a Plan</button>
    </div>
  );

  return (
    <div className="section">
      <div className="container">
        <Toaster position="top-center" />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Active Loan Session</h1>
            <p style={{ color: 'var(--muted-foreground)' }}>Track and manage your installment for <strong>{loan.productName}</strong></p>
          </div>
          <button 
            onClick={() => setShowCancelConfirm(true)}
            className="btn btn-outline" 
            style={{ color: 'red', borderColor: 'red' }}
          >
            Cancel Plan
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem' }}>
          {/* Summary Card */}
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '2rem',
            height: 'fit-content'
          }}>
            <img src={loan.productImage} alt="" style={{ width: '100%', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>{loan.productName}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Total Amount</span>
                <span style={{ fontWeight: 'bold' }}>{formatCurrency(loan.totalAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Months Paid</span>
                <span style={{ fontWeight: 'bold' }}>{loan.monthsPaid} / {loan.planMonths}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Next Payment</span>
                <span style={{ fontWeight: 'bold' }}>{formatCurrency(loan.monthlyAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Progress */}
          <div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '1.5rem' }}>Payment Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loan.payments.map((payment: any, index: number) => {
                const expired = isExpired(payment.deadline) && payment.status !== 'paid';
                const daysLeft = getDeadlineDiff(payment.deadline);
                
                return (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    padding: '1.5rem',
                    backgroundColor: payment.status === 'paid' ? 'var(--muted)' : 'var(--card)',
                    border: selectedMonths.includes(index) ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    opacity: payment.status === 'paid' ? 0.6 : 1,
                    position: 'relative',
                    cursor: payment.status === 'paid' ? 'default' : 'pointer'
                  }}
                  onClick={() => {
                    if (payment.status === 'paid') return;
                    
                    // Check if previous months are paid or selected
                    for (let i = 0; i < index; i++) {
                      if (loan.payments[i].status !== 'paid' && !selectedMonths.includes(i)) {
                        toast.error(`Please select Month ${i + 1} first.`);
                        return;
                      }
                    }

                    if (selectedMonths.includes(index)) {
                      // Deselect this and all subsequent months
                      setSelectedMonths(selectedMonths.filter(m => m < index));
                    } else {
                      setSelectedMonths([...selectedMonths, index]);
                    }
                  }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: payment.status === 'paid' ? 'var(--primary)' : (selectedMonths.includes(index) ? 'var(--primary)' : (expired ? 'red' : 'var(--border)')),
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {payment.status === 'paid' ? <FaCheckCircle /> : (selectedMonths.includes(index) ? <FaCheckCircle /> : index + 1)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>Month {index + 1} - {formatCurrency(payment.amount)}</div>
                      <div style={{ fontSize: '0.85rem', color: expired ? 'red' : 'var(--muted-foreground)' }}>
                        {payment.status === 'paid' 
                          ? `Paid on ${new Date(payment.paidAt.toDate ? payment.paidAt.toDate() : payment.paidAt).toLocaleDateString()}`
                          : `Deadline: ${new Date(payment.deadline.toDate ? payment.deadline.toDate() : payment.deadline).toLocaleDateString()}`
                        }
                        {expired && daysLeft < 0 && daysLeft > -6 && <span style={{ fontWeight: 'bold', marginLeft: '0.5rem' }}>[ DEADLINE: 5 DAYS GRACE ]</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedMonths.length > 0 && (
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const updatedPayments = [...loan.payments];
                    selectedMonths.forEach(idx => {
                      updatedPayments[idx].status = 'paid';
                      updatedPayments[idx].paidAt = new Date();
                    });

                    const loanRef = doc(db, 'installments', loan.id);
                    await updateDoc(loanRef, {
                      payments: updatedPayments,
                      monthsPaid: loan.monthsPaid + selectedMonths.length
                    });

                    toast.success(`Payment for ${selectedMonths.length} month(s) successful!`);
                    setSelectedMonths([]);
                    await fetchLoan(user?.email!);
                  } catch (error) {
                    toast.error('Payment failed.');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '2rem', padding: '1rem', fontSize: '1.1rem' }}
              >
                Pay Selected ({formatCurrency(selectedMonths.reduce((sum, idx) => sum + loan.payments[idx].amount, 0))})
              </button>
            )}
          </div>
        </div>

        {/* Cancellation Modal */}
        {showCancelConfirm && (
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
            justifyContent: 'center'
          }}>
            <div style={{
              backgroundColor: 'var(--background)',
              padding: '2.5rem',
              borderRadius: 'var(--radius)',
              maxWidth: '500px',
              textAlign: 'center'
            }}>
              <FaExclamationTriangle size={50} color="red" style={{ marginBottom: '1.5rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Cancel Installment Plan?</h2>
              <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
                If you cancel now, you will lose <strong>{installmentSettings.cancellationFee * 100}%</strong> of your already paid amounts as a processing fee. 
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowCancelConfirm(false)} className="btn btn-outline" style={{ flex: 1 }}>Go Back</button>
                <button onClick={handleCancelPlan} className="btn" style={{ flex: 1, backgroundColor: 'red', color: 'white' }}>Continue Cancellation</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
