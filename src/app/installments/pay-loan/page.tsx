'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { FaCalendarAlt, FaCheckCircle, FaExclamationTriangle, FaTrash, FaPrint } from 'react-icons/fa';
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
  const [siteName, setSiteName] = useState('');
  const [instSettings, setInstSettings] = useState<any>({ withdrawalFeePercent: 15 });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
        if (settingsSnap.exists()) setSiteName(settingsSnap.data().siteName || '');
        
        const instSnap = await getDocs(query(collection(db, 'settings'), where('__name__', '==', 'installments')));
        if (!instSnap.empty) setInstSettings(instSnap.docs[0].data());

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
    const displayUid = receiptId ? receiptId.substring(0, 10).toUpperCase() : `REF-${loan.id.substring(0, 4)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt - ${displayUid}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; margin: 0; display: flex; flex-direction: column; align-items: center; background: #f1f5f9; }
            .receipt { width: 380px; background: #fff; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
            .header { padding: 24px; background: #f8fafc; border-bottom: 1px dashed #e2e8f0; text-align: center; position: relative; }
            .logo { width: 48px; height: 48px; margin: 0 auto 8px; display: block; object-fit: contain; }
            .store-name { font-size: 18px; font-weight: 900; color: #D48806; text-transform: uppercase; letter-spacing: -0.05em; margin: 0; }
            .official { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px; }
            .copy-container { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 12px; }
            .id-badge { font-size: 8px; font-weight: bold; color: #94a3b8; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
            .copy-badge { font-size: 8px; font-weight: 900; color: #fff; background: #D48806; padding: 2px 10px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.1em; }
            .content { padding: 24px; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
            .label { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
            .value { font-size: 12px; font-weight: bold; color: #1e293b; text-align: right; max-width: 180px; word-break: break-all; margin: 0; }
            .total-row { margin-top: 24px; padding-top: 16px; border-top: 2px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
            .total-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
            .total-value { font-size: 24px; font-weight: 900; color: #D48806; }
            .status-badge { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; margin-top: 12px; }
            .status-text { font-size: 9px; font-weight: 900; color: #15803d; text-transform: uppercase; letter-spacing: 0.1em; }
            .footer { padding: 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; }
            .footer-thanks { font-size: 9px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0; }
            .footer-addr { font-size: 8px; font-weight: 500; color: #94a3b8; margin: 4px 0 0; }
            .print-btn { margin-top: 20px; padding: 12px 24px; background: #1e293b; color: #fff; border: none; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .print-btn:hover { background: #334155; transform: translateY(-1px); }
            @media print { 
              body { background: #fff; padding: 10px; display: block; } 
              .no-print { display: none; } 
              .receipt { border: 1px solid #e2e8f0; box-shadow: none; width: 380px; margin: 0 auto; border-radius: 16px; break-inside: avoid; } 
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <img src="/logos.png" class="logo" />
              <h1 class="store-name">${siteName.toUpperCase()}®</h1>
              <div class="official">Official Payment Receipt</div>
              <div class="copy-container">
                <span class="id-badge">ID: ${displayUid}</span>
                <span class="copy-badge">Customer Copy</span>
              </div>
            </div>
            <div class="content">
              <div class="row">
                <div class="label">Customer:</div>
                <div class="value">${loan.userEmail}</div>
              </div>
              <div class="row">
                <div class="label">Reference:</div>
                <div class="value">${paymentName === 'Initial Deposit' ? 'Deposit' : paymentName}</div>
              </div>
              <div class="row">
                <div class="label">Product:</div>
                <div class="value">${loan.productName}</div>
              </div>
              <div class="row">
                <div class="label">Date:</div>
                <div class="value">${new Date().toLocaleDateString('en-GB')}</div>
              </div>
              <div class="total-row">
                <div class="total-label">Paid:</div>
                <div class="total-value">${formatCurrency(amount)}</div>
              </div>
              <div class="status-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span class="status-text">Payment Verified</span>
              </div>
            </div>
            <div class="footer">
              <p class="footer-thanks">Thank you for choosing ${siteName}®!</p>
              <p class="footer-addr">168, Akarigbo Road, Sabo Sagamu, Ogun State.</p>
            </div>
          </div>
          <button class="no-print print-btn" onclick="window.print()">Print Receipt</button>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handlePrintFinalReceipt = (loanData: any) => {
    const displayUid = `FINAL-${loanData.id.substring(0, 6).toUpperCase()}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Final Receipt - ${displayUid}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; margin: 0; display: flex; flex-direction: column; align-items: center; background: #f1f5f9; }
            .receipt { width: 380px; background: #fff; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
            .header { padding: 24px; background: #f8fafc; border-bottom: 1px dashed #e2e8f0; text-align: center; position: relative; }
            .logo { width: 48px; height: 48px; margin: 0 auto 8px; display: block; object-fit: contain; }
            .store-name { font-size: 18px; font-weight: 900; color: #D48806; text-transform: uppercase; letter-spacing: -0.05em; margin: 0; }
            .official { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px; }
            .copy-container { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 12px; }
            .id-badge { font-size: 8px; font-weight: bold; color: #94a3b8; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
            .copy-badge { font-size: 8px; font-weight: 900; color: #fff; background: #D48806; padding: 2px 10px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.1em; }
            .content { padding: 24px; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
            .label { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
            .value { font-size: 11px; font-weight: bold; color: #1e293b; text-align: right; max-width: 180px; word-break: break-all; margin: 0; }
            .section-title { font-size: 10px; font-weight: 900; color: #1e293b; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 12px; margin-top: 20px; }
            .total-row { margin-top: 20px; padding-top: 16px; border-top: 2px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
            .total-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
            .total-value { font-size: 22px; font-weight: 900; color: #D48806; }
            .status-badge { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; margin-top: 16px; }
            .status-text { font-size: 10px; font-weight: 900; color: #15803d; text-transform: uppercase; letter-spacing: 0.1em; }
            .footer { padding: 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; }
            .footer-thanks { font-size: 9px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0; }
            .footer-addr { font-size: 8px; font-weight: 500; color: #94a3b8; margin: 4px 0 0; }
            .print-btn { margin-top: 20px; padding: 12px 24px; background: #1e293b; color: #fff; border: none; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .print-btn:hover { background: #334155; transform: translateY(-1px); }
            @media print { 
              body { background: #fff; padding: 10px; display: block; } 
              .no-print { display: none; } 
              .receipt { border: 1px solid #e2e8f0; box-shadow: none; width: 380px; margin: 0 auto; border-radius: 16px; break-inside: avoid; } 
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <img src="/logos.png" class="logo" />
              <h1 class="store-name">${siteName.toUpperCase()}®</h1>
              <div class="official">Official Completion Receipt</div>
              <div class="copy-container">
                <span class="id-badge">ID: ${displayUid}</span>
                <span class="copy-badge">Customer Copy</span>
              </div>
            </div>
            <div class="content">
              <div class="section-title">Customer & Product</div>
              <div class="row">
                <div class="label">Customer:</div>
                <div class="value">${loanData.userEmail}</div>
              </div>
              <div class="row">
                <div class="label">Product:</div>
                <div class="value">${loanData.productName}</div>
              </div>
              <div class="row">
                <div class="label">Plan:</div>
                <div class="value">${loanData.planMonths} Months</div>
              </div>

              <div class="section-title">Financial Summary</div>
              <div class="row">
                <div class="label">Base Price:</div>
                <div class="value">${formatCurrency(loanData.basePrice)}</div>
              </div>
              <div class="row">
                <div class="label">Interest/Fees:</div>
                <div class="value">${formatCurrency(loanData.totalAmount - loanData.basePrice)}</div>
              </div>
              <div class="row">
                <div class="label">Down Payment:</div>
                <div class="value">${formatCurrency(loanData.downPaymentPaid)}</div>
              </div>
              <div class="row">
                <div class="label">Installments:</div>
                <div class="value">${loanData.planMonths} x ${formatCurrency(loanData.monthlyAmount)}</div>
              </div>
              
              <div class="total-row">
                <div class="total-label">Total Paid:</div>
                <div class="total-value">${formatCurrency(loanData.totalAmountPaid || loanData.totalAmount)}</div>
              </div>

              <div class="status-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <span class="status-text">LOAN FULLY CLEARED</span>
              </div>
              <p style="text-align: center; font-size: 8px; color: #94a3b8; margin-top: 8px; font-weight: bold; text-transform: uppercase;">Completed on: ${new Date(loanData.completedAt?.seconds ? loanData.completedAt.seconds * 1000 : (loanData.completedAt || Date.now())).toLocaleDateString('en-GB')}</p>
            </div>
            <div class="footer">
              <p class="footer-thanks">Thank you for choosing ${siteName}®!</p>
              <p class="footer-addr">168, Akarigbo Road, Sabo Sagamu, Ogun State.</p>
            </div>
          </div>
          <button class="no-print print-btn" onclick="window.print()">Print Final Receipt</button>
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

      // Fee is calculated based on the percent locked at creation, or current fallback
      const withdrawalPercent = loan.withdrawalFeePercent !== undefined 
        ? loan.withdrawalFeePercent 
        : (instSettings.withdrawalFeePercent || 15);
        
      const withdrawalFee = withdrawalPercent / 100;
      const charge = loan.totalAmount * withdrawalFee;
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
                      <div className="flex gap-2">
                        {item.status === 'completed' && (
                          <button 
                            onClick={() => handlePrintFinalReceipt(item)}
                            className="border border-emerald-500 text-emerald-600 hover:bg-emerald-50 p-2 rounded-md transition-colors flex items-center gap-2 text-xs font-bold"
                          >
                            <FaPrint size={14} /> Final Receipt
                          </button>
                        )}
                        <button onClick={() => handleHideFromHistory(item.id)} className="border border-border text-foreground hover:bg-muted p-2 rounded-md transition-colors"><FaTrash size={14} /></button>
                      </div>
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
                If you cancel now, you will lose <strong>{loan.withdrawalFeePercent !== undefined ? loan.withdrawalFeePercent : instSettings.withdrawalFeePercent}%</strong> as a processing fee.
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
