'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { installmentSettings } from '@/data/installmentSettings';
import { FaCalendarAlt, FaCheckCircle, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function PayLoanPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loan, setLoan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [refundDetails, setRefundDetails] = useState({ accountName: '', accountNumber: '', bankName: '' });
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [siteName, setSiteName] = useState('Quick Choice');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
        if (settingsSnap.exists()) setSiteName(settingsSnap.data().siteName || 'Quick Choice');
        await fetchLoan(currentUser.email!);
        await fetchHistory(currentUser.uid);
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
      where('status', 'in', ['active', 'cancelling'])
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      setLoan({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
    } else {
      setLoan(null);
    }
    setLoading(false);
  };

  const fetchHistory = async (userId: string) => {
    const q = query(
      collection(db, 'installments'),
      where('userId', '==', userId),
      where('status', 'in', ['completed', 'cancelled', 'refunded'])
    );
    const querySnapshot = await getDocs(q);
    const historyData = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((item: any) => !item.hiddenFromUsers?.includes(userId));
    setHistory(historyData);
  };

  const handlePrintReceipt = (paymentName: string, amount: number, receiptId?: string) => {
    // Use the permanent receipt ID from the database, or a unique fallback for older records
    const displayUid = receiptId ? receiptId.substring(0, 10).toUpperCase() : `REF-${loan.id.substring(0, 4)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt - ${displayUid}</title>
          <style>
            body { font-family: 'Outfit', sans-serif; padding: 1.5rem; color: #333; }
            .receipt-container { border: 2px solid #eee; padding: 2rem; max-width: 450px; margin: 0 auto; border-radius: 10px; position: relative; }
            .receipt-uid { position: absolute; top: 1rem; right: 1.5rem; font-size: 0.65rem; color: #999; font-family: monospace; }
            .header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #D48806; padding-bottom: 1rem; }
            .logo-img { width: 55px; height: 55px; margin-bottom: 0.5rem; }
            .logo-text { font-size: 1.4rem; font-weight: bold; color: #D48806; }
            .details { margin-bottom: 1.5rem; }
            .row { display: flex; justify-content: space-between; padding: 0.7rem 0; border-bottom: 1px solid #f9f9f9; }
            .label { color: #666; font-size: 0.85rem; }
            .value { font-weight: bold; font-size: 0.9rem; }
            .product-name { font-size: 0.85rem; max-width: 220px; text-align: right; }
            .footer { text-align: center; margin-top: 2.5rem; font-size: 0.75rem; color: #999; line-height: 1.5; }
            .stamp { border: 2px solid green; color: green; display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; transform: rotate(-5deg); margin-top: 1rem; font-size: 0.8rem; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-uid">ID: ${displayUid}</div>
            <div class="header">
              <img src="/logos.png" class="logo-img" />
              <div class="logo-text">${siteName.toUpperCase()}&reg;</div>
              <div style="font-size: 0.75rem; margin-top: 0.4rem; letter-spacing: 1px; text-transform: uppercase;">Official Payment Receipt</div>
            </div>
            <div class="details">
              <div class="row"><span class="label">Customer:</span> <span class="value">${loan.userEmail}</span></div>
              <div class="row"><span class="label">Reference:</span> <span class="value">${paymentName}</span></div>
              <div class="row"><span class="label">Product:</span> <span class="value product-name">${loan.productName}</span></div>
              <div class="row"><span class="label">Date:</span> <span class="value">${new Date().toLocaleDateString('en-GB')}</span></div>
              <div class="row" style="font-size: 1.3rem; margin-top: 1.5rem; border-top: 2px solid #eee; padding-top: 1.5rem;">
                <span class="label">Paid:</span> <span class="value">${formatCurrency(amount)}</span>
              </div>
            </div>
            <div style="text-align: center;">
               <div class="stamp">PAYMENT VERIFIED</div>
            </div>
            <div class="footer">
              Thank you for choosing ${siteName}&reg;!<br/>
              168, Akarigbo Road, Sabo Sagamu, Ogun State.
            </div>
          </div>
          <div class="no-print" style="text-align: center; margin-top: 2rem;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #D48806; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem;">Print Receipt</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handleSubmitRefund = async () => {
    if (!refundDetails.accountNumber || !refundDetails.bankName) {
      toast.error('Please fill in all refund details.');
      return;
    }

    try {
      setLoading(true);
      // Sum all payments the customer has physically made so far
      const totalPaid = loan.payments
        .filter((p: any) => p.status === 'paid')
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      // Fee is 15% of the TOTAL loan amount (not the amount already paid)
      // This is the cancellation penalty to cover business costs
      const charge = loan.totalAmount * installmentSettings.cancellationFee;
      const refundAmount = totalPaid - charge;

      const loanRef = doc(db, 'installments', loan.id);
      await updateDoc(loanRef, {
        status: 'cancelling',
        totalAmountPaid: totalPaid,       // track how much was paid in total
        refundDetails: {
          ...refundDetails,
          requestedAt: new Date(),
          totalPaid: totalPaid,                            // e.g. ₦50
          cancellationFee: charge,                         // e.g. ₦15 (15% of loan total)
          refundAmount: Math.max(0, refundAmount),         // e.g. ₦35 (never negative)
          status: 'pending'
        }
      });

      toast.success('Refund request submitted! Our admin will process it shortly.');
      setShowRefundForm(false);
      await fetchLoan(user?.email!);
    } catch (error) {
      toast.error('Failed to submit refund request.');
    } finally {
      setLoading(false);
    }
  };

  const handleHideFromHistory = async (loanId: string) => {
    try {
      const loanRef = doc(db, 'installments', loanId);
      const currentHidden = history.find(h => h.id === loanId)?.hiddenFromUsers || [];
      await updateDoc(loanRef, {
        hiddenFromUsers: [...currentHidden, user?.uid]
      });
      toast.success('History cleared from view.');
      await fetchHistory(user?.uid!);
    } catch (error) {
      toast.error('Failed to clear history.');
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

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        <img src="/logos.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35px] h-[35px]" />
      </div>
      <div className="text-center">
        <h3 className="font-bold text-xl mb-1">{siteName}</h3>
        <p className="text-muted-foreground text-sm">Synchronizing your loan data...</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-16 text-center">
      <h2 className="text-2xl font-bold">Please sign in to view your loans.</h2>
      <button className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-md font-semibold mt-4 inline-block transition-colors" onClick={() => router.push('/installments')}>Go to Installments</button>
    </div>
  );

  return (
    <div className="py-16">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <Toaster position="top-center" />

        <div className="flex justify-between items-start mb-12 max-md:flex-col max-md:gap-4">
          <div>
            <h1 className="text-4xl font-bold">Installment Dashboard</h1>
            <p className="text-muted-foreground mt-2">Track your active loans and payment history</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="border border-border text-foreground hover:bg-muted px-4 py-2 rounded-md font-semibold transition-colors"
            >
              {showHistory ? 'Back to Active' : 'View History'}
            </button>
            {loan && loan.status === 'active' && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="border border-red-500 text-red-500 hover:bg-red-50 px-4 py-2 rounded-md font-semibold transition-colors"
              >
                Cancel Plan
              </button>
            )}
          </div>
        </div>

        {showHistory ? (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Payment History</h2>
              {history.length > 0 && (
                <button
                  onClick={() => history.forEach(h => handleHideFromHistory(h.id))}
                  className="border border-border text-foreground hover:bg-muted px-3 py-1.5 rounded-md text-sm transition-colors"
                >
                  Clear All History
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">No payment history found.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {history.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-[var(--radius)] p-6 flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4">
                    <div className="flex gap-6 items-center">
                      <img src={item.productImage} className="w-[60px] h-[60px] rounded-lg object-cover" />
                      <div>
                        <div className="font-bold">{item.productName}</div>
                        <div className="text-sm text-muted-foreground">Status: <span className={`capitalize font-medium ${item.status === 'completed' ? 'text-green-600' : 'text-red-500'}`}>{item.status}</span></div>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center max-md:w-full max-md:justify-between">
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(item.totalAmount)}</div>
                        <div className="text-xs text-muted-foreground">{new Date(item.createdAt.toDate()).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => handleHideFromHistory(item.id)} className="border border-border text-foreground hover:bg-muted p-2 rounded-md transition-colors"><FaTrash size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          !loan ? (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold mb-4">No active installment plans.</h2>
              <button className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-md font-semibold transition-colors" onClick={() => router.push('/installments')}>Start a Plan</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-12">
              <div className="bg-card border border-border rounded-[var(--radius)] p-8 h-fit">
                <img src={loan.productImage} alt="" className="w-full rounded-[var(--radius)] mb-6" />
                <h3 className="text-xl font-bold mb-4">{loan.productName}</h3>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-bold">{formatCurrency(loan.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Months Paid</span>
                    <span className="font-bold">{loan.monthsPaid} / {loan.planMonths}</span>
                  </div>
                  {loan.status === 'active' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Payment</span>
                      <span className="font-bold">{formatCurrency(loan.monthlyAmount)}</span>
                    </div>
                  )}
                </div>

                {loan.status === 'cancelling' && (
                  <div className="mt-8 p-6 bg-primary/10 rounded-[var(--radius)] border border-dashed border-primary">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin shrink-0" />
                      <h4 className="font-bold text-primary m-0">Refund Pending</h4>
                    </div>
                    {/* Fee breakdown */}
                    <div className="flex flex-col gap-1.5 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount You Paid</span>
                        <span className="font-bold">{formatCurrency(loan.refundDetails?.totalPaid || 0)}</span>
                      </div>
                      <div className="flex justify-between text-red-500">
                        <span>Cancellation Fee (15% of loan)</span>
                        <span className="font-bold">- {formatCurrency(loan.refundDetails?.cancellationFee || 0)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1.5 font-bold">
                        <span>You Receive</span>
                        <span className="text-green-600">{formatCurrency(loan.refundDetails?.refundAmount || 0)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground m-0">
                      To: <strong>{loan.refundDetails?.bankName} — {loan.refundDetails?.accountNumber}</strong>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-2xl mb-6">{loan.status === 'active' ? 'Payment Timeline' : 'Loan Status'}</h3>

                {loan.status === 'cancelling' ? (
                  <div className="bg-card p-8 rounded-[var(--radius)] border border-border">
                    <h2 className="text-xl font-bold mb-4">Plan Cancellation in Progress</h2>
                    <p className="mb-6">You have requested a refund for this plan. You will receive <strong>{formatCurrency(loan.refundDetails?.refundAmount)}</strong> once verified.</p>
                    <div className="flex items-center gap-4 text-primary">
                      <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
                      <span>Waiting for Admin Approval...</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-6 p-6 bg-muted border border-border rounded-[var(--radius)] opacity-80">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                        <FaCheckCircle />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">Initial Deposit - {formatCurrency(loan.downPaymentPaid)}</div>
                        <div className="text-sm text-muted-foreground">Paid on {new Date(loan.createdAt.toDate()).toLocaleDateString('en-GB')}</div>
                      </div>
                      <button onClick={() => handlePrintReceipt('Deposit', loan.downPaymentPaid, loan.payments[0].receiptId)} className="border border-border text-foreground hover:bg-muted text-xs px-3 py-1.5 rounded-md transition-colors shrink-0">Receipt</button>
                    </div>

                    {loan.payments.filter((p: any) => p.month > 1).map((payment: any, index: number) => {
                      const actualIndex = loan.payments.findIndex((p: any) => p.month === payment.month);
                      const expired = isExpired(payment.deadline) && payment.status !== 'paid';
                      return (
                        <div key={payment.month} className={`flex items-center gap-6 p-6 rounded-[var(--radius)] transition-colors ${payment.status === 'paid' ? 'bg-muted border-border opacity-60 cursor-default' : (selectedMonths.includes(actualIndex) ? 'bg-card border-2 border-primary cursor-pointer' : 'bg-card border border-border cursor-pointer hover:border-primary')}`}
                          onClick={() => {
                            if (payment.status === 'paid') return;
                            for (let i = 0; i < actualIndex; i++) {
                              if (loan.payments[i].status !== 'paid' && !selectedMonths.includes(i)) {
                                toast.error(`Please select Month ${loan.payments[i].month - 1} first.`);
                                return;
                              }
                            }
                            if (selectedMonths.includes(actualIndex)) {
                              setSelectedMonths(selectedMonths.filter(m => m < actualIndex));
                            } else {
                              setSelectedMonths([...selectedMonths, actualIndex]);
                            }
                          }}
                        >
                          <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 ${payment.status === 'paid' || selectedMonths.includes(actualIndex) ? 'bg-primary' : (expired ? 'bg-red-500' : 'bg-border text-muted-foreground')}`}>
                            {payment.status === 'paid' ? <FaCheckCircle /> : (selectedMonths.includes(actualIndex) ? <FaCheckCircle /> : payment.month - 1)}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold">Month {payment.month - 1} - {formatCurrency(payment.amount)}</div>
                            <div className={`text-sm ${expired ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                              {payment.status === 'paid' ? `Paid on ${new Date(payment.paidAt.toDate()).toLocaleDateString('en-GB')}` : `Deadline: ${new Date(payment.deadline.toDate()).toLocaleDateString('en-GB')}`}
                            </div>
                          </div>
                          {payment.status === 'paid' && (
                            <button onClick={(e) => { e.stopPropagation(); handlePrintReceipt(`Month ${payment.month - 1}`, payment.amount, payment.receiptId); }} className="border border-border text-foreground hover:bg-muted text-xs px-3 py-1.5 rounded-md transition-colors shrink-0">Receipt</button>
                          )}
                        </div>
                      );
                    })}

                    {selectedMonths.length > 0 && (
                      <button onClick={() => router.push(`/installments/checkout?loanId=${loan.id}&months=${selectedMonths.join(',')}`)} className="w-full mt-8 p-4 text-lg bg-primary hover:bg-primary-hover text-white rounded-md font-semibold transition-colors">
                        Proceed to Pay ({formatCurrency(selectedMonths.reduce((sum, idx) => sum + loan.payments[idx].amount, 0))})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4">
            <div className="bg-background p-10 rounded-[var(--radius)] max-w-[500px] w-full text-center shadow-xl">
              <FaExclamationTriangle size={50} color="red" className="mb-6 mx-auto" />
              <h2 className="text-2xl font-bold mb-4">Cancel Installment Plan?</h2>
              <p className="text-muted-foreground mb-8">
                If you cancel now, you will lose <strong>{installmentSettings.cancellationFee * 100}%</strong> as a processing fee.
                Refund will be processed to your account.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setShowCancelConfirm(false)} className="flex-1 border border-border hover:bg-muted text-foreground py-3 rounded-md font-semibold transition-colors">Go Back</button>
                <button onClick={() => { setShowCancelConfirm(false); setShowRefundForm(true); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-md font-semibold transition-colors">Continue to Refund</button>
              </div>
            </div>
          </div>
        )}

        {showRefundForm && (
          <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4">
            <div className="bg-background p-8 rounded-[var(--radius)] max-w-[500px] w-full shadow-xl">
              <h2 className="text-2xl font-bold mb-6">Refund Account Details</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter the account where you want to receive your refund.</p>

              <div className="flex flex-col gap-4 mb-8">
                <input
                  type="text"
                  placeholder="Account Name"
                  value={refundDetails.accountName}
                  onChange={(e) => setRefundDetails({ ...refundDetails, accountName: e.target.value })}
                  className="w-full p-4 rounded-lg border border-border bg-background outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Account Number"
                  value={refundDetails.accountNumber}
                  onChange={(e) => setRefundDetails({ ...refundDetails, accountNumber: e.target.value })}
                  className="w-full p-4 rounded-lg border border-border bg-background outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Bank Name"
                  value={refundDetails.bankName}
                  onChange={(e) => setRefundDetails({ ...refundDetails, bankName: e.target.value })}
                  className="w-full p-4 rounded-lg border border-border bg-background outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowRefundForm(false)} className="flex-1 border border-border hover:bg-muted text-foreground py-3 rounded-md font-semibold transition-colors">Cancel</button>
                <button onClick={handleSubmitRefund} className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-md font-semibold transition-colors">Submit & Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
