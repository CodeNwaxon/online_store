'use client';

import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { products } from '@/data/products';
import {
  FaWhatsapp,
  FaPhoneAlt,
  FaEnvelope,
  FaTrash,
  FaTimesCircle,
  FaPrint,
  FaUser,
  FaWallet,
  FaExclamationCircle,
  FaLock,
  FaCog,
  FaSave,
  FaCheckCircle,
  FaArrowRight,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
  FaReceipt,
  FaTimes,
  FaCalendarAlt,
  FaIdCard,
  FaHistory,
  FaShoppingBag
} from 'react-icons/fa';
import Image from 'next/image';
import { uploadImageToCloudinary } from '@/actions/upload';

interface PastDueStatus {
  isPastDue: boolean;
  daysPastDue: number;
  isWithinGrace: boolean;
  graceDaysLeft: number;
  deadlineDate: Date | null;
}

const getPastDueStatus = (inst: any, gracePeriodDaysSetting: number = 5): PastDueStatus => {
  if (inst.status !== 'active') {
    return { isPastDue: false, daysPastDue: 0, isWithinGrace: false, graceDaysLeft: 0, deadlineDate: null };
  }

  const payments = inst.payments || [];
  const pendingPayments = payments.filter((p: any) => p.status === 'pending');
  if (pendingPayments.length === 0) {
    return { isPastDue: false, daysPastDue: 0, isWithinGrace: false, graceDaysLeft: 0, deadlineDate: null };
  }

  const getDeadline = (p: any) => {
    if (!p.deadline) return null;
    if (typeof p.deadline.toDate === 'function') return p.deadline.toDate();
    if (p.deadline.seconds) return new Date(p.deadline.seconds * 1000);
    return new Date(p.deadline);
  };

  const sortedPending = pendingPayments
    .map((p: any) => ({ ...p, parsedDeadline: getDeadline(p) }))
    .filter((p: any) => p.parsedDeadline !== null)
    .sort((a: any, b: any) => a.parsedDeadline.getTime() - b.parsedDeadline.getTime());

  if (sortedPending.length === 0) {
    return { isPastDue: false, daysPastDue: 0, isWithinGrace: false, graceDaysLeft: 0, deadlineDate: null };
  }

  const firstPending = sortedPending[0];
  const deadline = firstPending.parsedDeadline;
  const now = new Date();

  const dDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (nDate > dDate) {
    const diffTime = nDate.getTime() - dDate.getTime();
    const daysPastDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const gracePeriod = inst.gracePeriodDays ?? gracePeriodDaysSetting;
    const isWithinGrace = daysPastDue < gracePeriod;
    const graceDaysLeft = isWithinGrace ? (gracePeriod - daysPastDue) : 0;

    return {
      isPastDue: true,
      daysPastDue,
      isWithinGrace,
      graceDaysLeft,
      deadlineDate: deadline
    };
  }

  return { isPastDue: false, daysPastDue: 0, isWithinGrace: false, graceDaysLeft: 0, deadlineDate: deadline };
};

export default function AdminInstallments() {
  const [activeTab, setActiveTab] = useState<'installments' | 'complaints' | 'settings'>('installments');
  const [installments, setInstallments] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showReceipt, setShowReceipt] = useState<string | null>(null);
  const [showFinalReceipt, setShowFinalReceipt] = useState<any | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState<{ type: string, id: string } | null>(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: string, id: string } | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'plans' | 'fees' | 'policy'>('plans');
  const [visibleCards, setVisibleCards] = useState(40);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showReceiptInput, setShowReceiptInput] = useState<string | null>(null);

  // Installment Settings State
  const [instSettings, setInstSettings] = useState({
    shortPlan: { months: 3, increase: 20 },
    longPlan: { months: 4, increase: 30 },
    downpaymentThreshold: 1000000,
    downpaymentUnderThreshold: 30,
    downpaymentOverThreshold: 50,
    gracePeriodDays: 5,
    lateFeePercent: 5,
    withdrawalFeePercent: 15,
    deliveryPolicy: "Goods are only delivered at the completion of payment."
  });

  // Filters for installments
  const [filter, setFilter] = useState<'all' | 'unsettled' | 'cleared' | 'vip' | 'past_due'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubInst = onSnapshot(query(collection(db, 'installments'), orderBy('createdAt', 'desc')), (snap) => {
      setInstallments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Installments listener error:", error);
    });
    const unsubComp = onSnapshot(query(collection(db, 'complaints'), orderBy('createdAt', 'desc')), (snap) => {
      setComplaints(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Complaints listener error:", error);
    });

    const loadSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'installments'));
      if (docSnap.exists()) {
        setInstSettings(prev => ({ ...prev, ...docSnap.data() }));
      }
    };
    loadSettings();

    return () => { unsubInst(); unsubComp(); };
  }, []);

  const handleAction = (type: 'call' | 'whatsapp' | 'email', contact: string) => {
    let url = '';
    let cleanPhone = contact.replace(/\D/g, '');

    // If it starts with 2340..., remove the 0
    if (cleanPhone.startsWith('2340')) {
      cleanPhone = '234' + cleanPhone.slice(4);
    }
    // If it starts with 0..., replace with 234...
    else if (cleanPhone.startsWith('0')) {
      cleanPhone = '234' + cleanPhone.slice(1);
    }
    // If it doesn't start with 234, add it
    else if (!cleanPhone.startsWith('234')) {
      cleanPhone = '234' + cleanPhone;
    }

    const nigerianPhone = `+${cleanPhone}`;

    if (type === 'call') url = `tel:${nigerianPhone}`;
    if (type === 'whatsapp') url = `https://wa.me/${nigerianPhone.replace('+', '')}`;
    if (type === 'email') url = `mailto:${contact}`;

    window.open(url, '_blank');
  };

  const verifyPasskey = async (actionType: string, id: string) => {
    setIsVerifying(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const correctPasskey = settingsDoc.data()?.passkey || 'admin1234';

      if (passkeyInput === correctPasskey) {
        if (actionType === 'deleteComplaint') {
        await deleteDoc(doc(db, 'complaints', id));
        toast.success('Complaint deleted.');
      } else if (actionType === 'clearPayment') {
        let receiptUrl = null;
        if (receiptFile) {
          const toastId = toast.loading('Uploading receipt...');
          try {
            const formData = new FormData();
            formData.append('file', receiptFile);
            const data = await uploadImageToCloudinary(formData);
            receiptUrl = data.secure_url;
            toast.success('Receipt uploaded successfully!', { id: toastId });
          } catch (error) {
            toast.error('Failed to upload receipt', { id: toastId });
            return; // stop execution if upload fails
          }
        }

        const updateData: any = {
          status: 'cleared',
          settledAt: new Date().toISOString()
        };
        if (receiptUrl) updateData.adminRefundReceiptUrl = receiptUrl;

        await updateDoc(doc(db, 'installments', id), updateData);
        toast.success('Payment marked as cleared.');
        setReceiptFile(null);
        setShowReceiptInput(null);
      } else if (actionType === 'deleteSettled') {
        await deleteDoc(doc(db, 'installments', id));
        toast.success('Record deleted.');
      } else if (actionType === 'saveInstallmentSettings') {
        await setDoc(doc(db, 'settings', 'installments'), instSettings);
        toast.success('Installment settings updated successfully!');
      }
      setShowPasskeyModal(null);
      setPasskeyInput('');
    } else {
      toast.error('Incorrect Passkey');
    }
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePrintAdminReceipt = () => {
    if (!receiptData) return;
    const displayUid = receiptData.id?.substring(0, 10).toUpperCase();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Admin Receipt - ${displayUid}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; margin: 0; display: flex; flex-direction: column; align-items: center; background: #fff; }
            .receipt { width: 380px; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
            .header { padding: 24px; background: #f8fafc; border-bottom: 1px dashed #e2e8f0; text-align: center; }
            .logo { width: 48px; height: 48px; margin: 0 auto 8px; display: block; object-fit: contain; }
            .store-name { font-size: 18px; font-weight: 900; color: #D48806; text-transform: uppercase; letter-spacing: -0.05em; margin: 0; }
            .official { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px; }
            .copy-container { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 12px; }
            .id-badge { font-size: 8px; font-weight: bold; color: #94a3b8; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
            .copy-badge { font-size: 8px; font-weight: 900; color: #fff; background: #1e293b; padding: 2px 10px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.1em; }
            .content { padding: 24px; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
            .label { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
            .value { font-size: 12px; font-weight: bold; color: #1e293b; text-align: right; max-width: 180px; word-break: break-all; margin: 0; }
            .total-row { margin-top: 24px; padding-top: 16px; border-top: 2px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
            .total-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
            .total-value { font-size: 24px; font-weight: 900; color: #D48806; }
            .status-badge { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; margin-top: 12px; }
            .status-text { font-size: 9px; font-weight: 900; color: #15803d; text-transform: uppercase; letter-spacing: 0.1em; }
            .footer { padding: 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; }
            .footer-thanks { font-size: 9px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0; }
            .footer-addr { font-size: 8px; font-weight: 500; color: #94a3b8; margin: 4px 0 0; }
            @media print { body { padding: 10px; } .receipt { border: 1px solid #e2e8f0; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <img src="/logos.png" class="logo" />
              <h1 class="store-name">QUICK CHOICE®</h1>
              <div class="official">Official Payment Receipt</div>
              <div class="copy-container">
                <span class="id-badge">ID: ${displayUid}</span>
                <span class="copy-badge">Admin Copy</span>
              </div>
            </div>
            <div class="content">
              <div class="row">
                <div class="label">Customer:</div>
                <div class="value">${receiptData.userEmail || receiptData.email}</div>
              </div>
              <div class="row">
                <div class="label">Reference:</div>
                <div class="value">${receiptData.paymentName === 'Initial Deposit' ? 'Deposit' : receiptData.paymentName}</div>
              </div>
              <div class="row">
                <div class="label">Product:</div>
                <div class="value">${receiptData.productName}</div>
              </div>
              <div class="row">
                <div class="label">Date:</div>
                <div class="value">${new Date(receiptData.createdAt?.seconds ? receiptData.createdAt.seconds * 1000 : receiptData.createdAt).toLocaleDateString('en-GB')}</div>
              </div>
              <div class="total-row">
                <div class="total-label">Paid:</div>
                <div class="total-value">₦${receiptData.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div class="status-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span class="status-text">Payment Verified</span>
              </div>
            </div>
            <div class="footer">
              <p class="footer-thanks">Thank you for choosing Quick Choice®!</p>
              <p class="footer-addr">168, Akarigbo Road, Sabo Sagamu, Ogun State.</p>
            </div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handlePrintFinalAdminReceipt = (loanData: any) => {
    const displayUid = `FINAL-${loanData.id.substring(0, 6).toUpperCase()}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Final Receipt - ${displayUid}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; margin: 0; display: flex; flex-direction: column; align-items: center; background: #fff; }
            .receipt { width: 380px; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
            .header { padding: 24px; background: #f8fafc; border-bottom: 1px dashed #e2e8f0; text-align: center; }
            .logo { width: 48px; height: 48px; margin: 0 auto 8px; display: block; object-fit: contain; }
            .store-name { font-size: 18px; font-weight: 900; color: #D48806; text-transform: uppercase; letter-spacing: -0.05em; margin: 0; }
            .official { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px; }
            .copy-container { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 12px; }
            .id-badge { font-size: 8px; font-weight: bold; color: #94a3b8; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
            .copy-badge { font-size: 8px; font-weight: 900; color: #fff; background: #1e293b; padding: 2px 10px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.1em; }
            .content { padding: 24px; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
            .label { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
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
            @media print { body { padding: 10px; } .receipt { border: 1px solid #e2e8f0; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <img src="/logos.png" class="logo" />
              <h1 class="store-name">QUICK CHOICE®</h1>
              <div class="official">Official Completion Receipt</div>
              <div class="copy-container">
                <span class="id-badge">ID: ${displayUid}</span>
                <span class="copy-badge">Admin Copy</span>
              </div>
            </div>
            <div class="content">
              <div class="section-title">Customer & Product</div>
              <div class="row">
                <div class="label">Customer:</div>
                <div class="value">${loanData.userEmail || loanData.payerInfo?.email}</div>
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
                <div class="value">₦${(loanData.basePrice || 0).toLocaleString()}</div>
              </div>
              <div class="row">
                <div class="label">Interest/Fees:</div>
                <div class="value">₦${((loanData.totalAmount || 0) - (loanData.basePrice || 0)).toLocaleString()}</div>
              </div>
              <div class="row">
                <div class="label">Down Payment:</div>
                <div class="value">₦${(loanData.downPaymentPaid || 0).toLocaleString()}</div>
              </div>
              
              <div class="total-row">
                <div class="total-label">Total Paid:</div>
                <div class="total-value">₦${(loanData.totalAmountPaid || loanData.totalAmount || 0).toLocaleString()}</div>
              </div>

              <div class="status-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <span class="status-text">LOAN FULLY CLEARED</span>
              </div>
              <p style="text-align: center; font-size: 8px; color: #94a3b8; margin-top: 8px; font-weight: bold; text-transform: uppercase;">Completed on: ${new Date(loanData.completedAt?.seconds ? loanData.completedAt.seconds * 1000 : (loanData.completedAt || Date.now())).toLocaleDateString('en-GB')}</p>
            </div>
            <div class="footer">
              <p class="footer-thanks">Thank you for choosing Quick Choice®!</p>
              <p class="footer-addr">168, Akarigbo Road, Sabo Sagamu, Ogun State.</p>
            </div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const markAsRead = async (item: any) => {
    if (item.isNew) {
      const collectionName = activeTab === 'installments' ? 'installments' : 'complaints';
      await updateDoc(doc(db, collectionName, item.id), { isNew: false });
    }
    setSelectedItem(item);
    setShowPaymentHistory(false);
  };

  useEffect(() => {
    if (showReceipt) {
      const fetchReceipt = async () => {
        setLoadingReceipt(true);
        try {
          const docSnap = await getDoc(doc(db, 'receipts', showReceipt));
          if (docSnap.exists()) {
            setReceiptData({ id: docSnap.id, ...docSnap.data() });
          }
        } catch (error) {
          console.error("Error fetching receipt:", error);
        } finally {
          setLoadingReceipt(false);
        }
      };
      fetchReceipt();
    } else {
      setReceiptData(null);
    }
  }, [showReceipt]);

  const filteredInstallments = installments.filter(inst => {
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let matchesSearch = true;
    if (searchTerms.length > 0) {
      const normalize = (str: string) => {
        if (!str) return '';
        return str.toLowerCase()
          .replace(/sh/g, 'ch')
          .replace(/s/g, 'c')
          .replace(/ph/g, 'f')
          .replace(/k/g, 'c')
          .replace(/\s/g, '');
      };

      matchesSearch = searchTerms.every(term => {
        const normTerm = normalize(term);
        const checkField = (fieldVal: string) => {
          if (!fieldVal) return false;
          const lowerVal = fieldVal.toLowerCase();
          const normVal = normalize(fieldVal);
          return lowerVal.includes(term) || normVal.includes(normTerm);
        };

        return (
          checkField(inst.product?.name || '') ||
          checkField(inst.productName || '') ||
          checkField(inst.customerName || '') ||
          checkField(inst.payerInfo?.fullName || '') ||
          checkField(inst.userEmail || '')
        );
      });
    }

    if (!matchesSearch) return false;

    if (filter === 'unsettled') return inst.status === 'cancelled' || inst.status === 'cancelling';
    if (filter === 'cleared') return inst.status === 'cleared' || inst.status === 'completed' || (inst.status === 'cancelled' && inst.isRefunded);
    if (filter === 'vip') return inst.status === 'completed';
    if (filter === 'past_due') {
      return getPastDueStatus(inst, instSettings.gracePeriodDays).isPastDue;
    }
    return true;
  });

  const formatNumberWithCommas = (val: number | string) => {
    if (!val && val !== 0) return '';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="space-y-8">
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 px- md:px-0">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold">Financials & Feedback</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Manage installments and complaints.</p>
        </div>
        <div className="bg-muted p-1 rounded-lg flex gap-1 border border-border w-full md:w-auto">
          <button
            onClick={() => setActiveTab('installments')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'installments' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Installments {installments.filter(i => i.isNew).length > 0 && <span className="bg-secondary text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse">New</span>}
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'complaints' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Complaints {complaints.filter(c => c.isNew).length > 0 && <span className="bg-secondary text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse">New</span>}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'installments' && (
        <div className="space-y-6">
          {/* INSTALLMENT FILTERS & SEARCH */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between px-4 md:px-0">
            <div className="flex flex-wrap gap-2">
              {['all', 'unsettled', 'cleared', 'vip', 'past_due'].map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f as any); setVisibleCards(40); }}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full border text-[0.7rem] md:text-sm font-bold capitalize transition-all ${filter === f ? 'bg-primary text-white border-primary shadow-md' : 'bg-card border-border text-muted-foreground hover:border-primary'}`}
                >
                  {f === 'all' && 'All'}
                  {f === 'unsettled' && 'Pending Refund'}
                  {f === 'cleared' && 'Cleared/Cancelled'}
                  {f === 'vip' && 'Completed (VIP)'}
                  {f === 'past_due' && 'Past Due'}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search by product name..."
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <svg
                className="absolute left-3 top-2.5 text-muted-foreground size-4"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* INSTALLMENT CARDS */}
          {filteredInstallments.length > 0 ? (
            <div className="pb-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0">
                {filteredInstallments.slice(0, visibleCards).map(inst => (
                  <div
                    key={inst.id}
                    onClick={() => markAsRead(inst)}
                    className={`bg-card p-4 md:p-6 rounded-[var(--radius)] border-2 cursor-pointer transition-all hover:shadow-lg relative overflow-hidden group
                    ${inst.status === 'cancelled' && !inst.isRefunded ? 'border-secondary animate-[pulse_2s_infinite]' : 'border-border'}
                    ${inst.isNew ? 'border-green-500 animate-[pulse_2.5s_infinite]' : ''}
                  `}
                  >
                    {(inst.status === 'completed' || inst.status === 'cleared') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPasskeyModal({ type: 'deleteSettled', id: inst.id });
                        }}
                        className="absolute top-8 right-4 text-muted-foreground hover:text-secondary opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all p-2 z-10"
                        title="Delete Record"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                    {(() => {
                      if (inst.status === 'completed') {
                        return <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] px-3 py-1 font-bold rounded-bl-lg">COMPLETED</div>;
                      }
                      if (inst.status === 'cancelling' || (inst.status === 'cancelled' && !inst.isRefunded)) {
                        return <div className="absolute top-0 right-0 bg-yellow-400 text-red-800 text-[9px] px-3 py-1 font-bold rounded-bl-lg">PENDING REFUND</div>;
                      }
                      if (inst.status === 'cleared' || (inst.status === 'cancelled' && inst.isRefunded)) {
                        return <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-3 py-1 font-bold rounded-bl-lg">CANCELLED</div>;
                      }
                      return null;
                    })()}

                    <div className="flex items-center gap-3 md:gap-4 mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted flex items-center justify-center text-primary">
                        <FaUser size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold leading-tight text-sm md:text-base truncate">{inst.customerName || inst.payerInfo?.fullName || 'Unknown'}</h3>
                        <p className="text-[0.65rem] md:text-xs text-muted-foreground truncate flex items-center flex-wrap">
                          {inst.productName || inst.product?.name || 'Product deleted'}
                          <span className="bg-muted rounded p-0.5 ml-2 font-bold text-[0.7rem] md:text-xs">
                            ₦{(inst.totalAmount || inst.product?.price || 0).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-[0.8rem] md:text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Down Payment:</span>
                        <span className="font-bold">₦{(inst.downPaymentPaid || inst.downPayment || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration/Months:</span>
                        <span className="font-bold">{inst.planMonths || inst.months || 'N/A'} Months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Payment:</span>
                        <span className="font-bold">₦{(inst.monthlyAmount || Math.round(((inst.product?.price || inst.totalAmount || 0) - (inst.downPaymentPaid || inst.downPayment || 0)) / (inst.planMonths || inst.months || 1))).toLocaleString()}</span>
                      </div>
                      {inst.isNew && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(inst); }}
                          className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white py-2 rounded-md font-bold text-xs transition-colors"
                        >
                          Mark as Read
                        </button>
                      )}

                      {(() => {
                        const status = getPastDueStatus(inst, instSettings.gracePeriodDays);
                        if (!status.isPastDue) return null;

                        if (status.isWithinGrace) {
                          return (
                            <div className="w-full mt-3 p-3 bg-gradient-to-r from-amber-500/10 to-amber-600/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-md font-bold text-xs flex flex-col items-center gap-1 text-center">
                              <span className="flex items-center gap-1.5">
                                <FaExclamationCircle className="text-amber-500 animate-pulse size-3.5" />
                                5-Day Grace Period
                              </span>
                              <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400">
                                {status.graceDaysLeft} Day{status.graceDaysLeft !== 1 ? 's' : ''} Left
                              </span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="w-full mt-3 p-3 bg-gradient-to-r from-red-500/10 to-red-600/15 border-2 border-red-500 text-red-600 dark:text-red-400 rounded-md font-bold text-xs flex flex-col items-center gap-1 text-center shadow-sm">
                              <span className="flex items-center gap-1.5">
                                <FaExclamationCircle className="text-red-600 animate-bounce size-3.5" />
                                OVERDUE LOAN
                              </span>
                              <span className="text-[10px] font-extrabold uppercase tracking-wide bg-red-600 text-white px-2 py-0.5 rounded-full mt-0.5">
                                Past Due Date: {status.daysPastDue} Day{status.daysPastDue !== 1 ? 's' : ''}
                              </span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              {visibleCards < filteredInstallments.length && (
                <div className="text-center mt-8 mb-4 flex flex-col items-center justify-center gap-4 animate-[fadeIn_0.5s_ease-out]">
                  <div className="text-xs text-muted-foreground font-medium tracking-wide">
                    Showing {Math.min(visibleCards, filteredInstallments.length)} of {filteredInstallments.length} items
                  </div>
                  <button
                    className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-border bg-background hover:bg-muted text-foreground hover:text-primary px-4 py-2 text-xs md:text-sm font-bold tracking-wider uppercase shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md active:scale-95 active:shadow-sm"
                    onClick={() => setVisibleCards(prev => prev + 40)}
                  >
                    <span className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span>Load More Installments</span>
                    <FaChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-y-0.5 transition-all duration-300 ease-out" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center bg-card rounded-xl border border-dashed border-border mx-0">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                <FaWallet size={30} />
              </div>
              <h3 className="text-lg font-bold">No installments</h3>
              <p className="text-sm text-muted-foreground">There are currently no installment plans to display for this filter.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'complaints' && (
        /* COMPLAINTS LIST */
        <div className="space-y-4 px-0">
          {complaints.length > 0 ? (
            complaints.map(comp => (
              <div
                key={comp.id}
                onClick={() => markAsRead(comp)}
                className={`bg-card p-4 md:p-6 rounded md:rounded-[var(--radius)] border-2 transition-all hover:border-primary cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4
                  ${comp.isNew ? 'border-secondary animate-pulse' : 'border-border'}
                `}
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="text-primary shrink-0"><FaExclamationCircle size={20} /></div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm md:text-base">{comp.name}</h3>
                    <p className="text-[0.8rem] md:text-sm text-muted-foreground line-clamp-1">{comp.message}</p>
                  </div>
                </div>
                <div className="flex gap-4 w-full sm:w-auto justify-end items-center">
                  {comp.isNew && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(comp); }}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md font-bold text-xs transition-colors shrink-0"
                    >
                      Mark as Read
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleAction('whatsapp', comp.phone); }} className="text-[#25D366] p-2 hover:bg-[#25D366]/10 rounded-full"><FaWhatsapp size={20} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleAction('call', comp.phone); }} className="text-primary p-2 hover:bg-primary/10 rounded-full"><FaPhoneAlt size={18} /></button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete({ type: 'deleteComplaint', id: comp.id });
                    }} className="text-secondary p-2 hover:bg-secondary/10 rounded-full"><FaTrash size={18} /></button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded md:rounded-xl border border-dashed border-border">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                <FaExclamationCircle size={30} />
              </div>
              <h3 className="text-lg font-bold">No complaints from customers</h3>
              <p className="text-sm text-muted-foreground">Everything seems to be running smoothly. No complaints reported yet.</p>
            </div>
          )}
        </div>
      )}
      {activeTab === 'settings' && (
        /* INSTALLMENT SETTINGS SECTION */
        <div className="bg-card border border-border rounded md:rounded-xl overflow-hidden shadow-sm mt-0 mx-0">
          <div className="bg-muted px-3 md:px-6 py-4 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaCog className="text-primary" /> Installment Settings
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Configure interest rates, months, and payment policies.</p>
            </div>
            <button
              onClick={() => setShowPasskeyModal({ type: 'saveInstallmentSettings', id: 'new-settings' })}
              className="bg-primary text-white px-6 py-2 rounded-md font-bold text-sm hover:bg-primary-hover transition-colors flex items-center gap-2"
            >
              <FaSave /> Save Settings
            </button>
          </div>

          <div className="py-6 px-3 md:p-6">
            <div className="flex gap-4 border-b border-border mb-6">
              <button onClick={() => setActiveSettingsTab('plans')} className={`pb-2 px-1 text-sm font-bold transition-all border-b-2 ${activeSettingsTab === 'plans' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Plans & Months</button>
              <button onClick={() => setActiveSettingsTab('fees')} className={`pb-2 px-1 text-sm font-bold transition-all border-b-2 ${activeSettingsTab === 'fees' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Interest & Fees</button>
              <button onClick={() => setActiveSettingsTab('policy')} className={`pb-2 px-1 text-sm font-bold transition-all border-b-2 ${activeSettingsTab === 'policy' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Policies</button>
            </div>

            {activeSettingsTab === 'plans' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <h3 className="font-bold text-sm mb-4">Short-term Plan</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Months</label>
                        <input
                          type="number"
                          className="w-full bg-background border border-border rounded p-2 text-sm"
                          value={instSettings.shortPlan.months || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setInstSettings(prev => ({ ...prev, shortPlan: { ...prev.shortPlan, months: isNaN(val) ? 0 : val } }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Interest (%)</label>
                        <input
                          type="number"
                          className="w-full bg-background border border-border rounded p-2 text-sm"
                          value={instSettings.shortPlan.increase || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setInstSettings(prev => ({ ...prev, shortPlan: { ...prev.shortPlan, increase: isNaN(val) ? 0 : val } }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <h3 className="font-bold text-sm mb-4">Long-term Plan</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Months</label>
                        <input
                          type="number"
                          className="w-full bg-background border border-border rounded p-2 text-sm"
                          value={instSettings.longPlan.months || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setInstSettings(prev => ({ ...prev, longPlan: { ...prev.longPlan, months: isNaN(val) ? 0 : val } }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Interest (%)</label>
                        <input
                          type="number"
                          className="w-full bg-background border border-border rounded p-2 text-sm"
                          value={instSettings.longPlan.increase || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setInstSettings(prev => ({ ...prev, longPlan: { ...prev.longPlan, increase: isNaN(val) ? 0 : val } }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block">Price Threshold (₦)</label>
                    <input
                      type="text"
                      className="w-full bg-background border border-border rounded p-2 text-sm font-bold"
                      value={formatNumberWithCommas(instSettings.downpaymentThreshold)}
                      onChange={(e) => {
                        const val = e.target.value.replace(/,/g, '');
                        if (val === '') {
                          setInstSettings(prev => ({ ...prev, downpaymentThreshold: 0 }));
                          return;
                        }
                        if (!isNaN(Number(val))) {
                          setInstSettings(prev => ({ ...prev, downpaymentThreshold: Number(val) }));
                        }
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Example: 1,000,000</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block">Below Threshold (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-full bg-background border border-border rounded p-2 text-sm font-bold"
                        value={instSettings.downpaymentUnderThreshold || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setInstSettings(prev => ({ ...prev, downpaymentUnderThreshold: isNaN(val) ? 0 : val }));
                        }}
                      />
                      <span className="text-sm font-bold">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block">Above Threshold (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-full bg-background border border-border rounded p-2 text-sm font-bold"
                        value={instSettings.downpaymentOverThreshold || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setInstSettings(prev => ({ ...prev, downpaymentOverThreshold: isNaN(val) ? 0 : val }));
                        }}
                      />
                      <span className="text-sm font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSettingsTab === 'fees' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Grace Period (Days)</label>
                  <input
                    type="number"
                    className="w-full bg-background border border-border rounded p-2 text-sm font-bold"
                    value={instSettings.gracePeriodDays || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setInstSettings(prev => ({ ...prev, gracePeriodDays: isNaN(val) ? 0 : val }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Late Fee (%)</label>
                  <input
                    type="number"
                    className="w-full bg-background border border-border rounded p-2 text-sm font-bold"
                    value={instSettings.lateFeePercent || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setInstSettings(prev => ({ ...prev, lateFeePercent: isNaN(val) ? 0 : val }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Withdrawal Fee (%)</label>
                  <input
                    type="number"
                    className="w-full bg-background border border-border rounded p-2 text-sm font-bold"
                    value={instSettings.withdrawalFeePercent || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setInstSettings(prev => ({ ...prev, withdrawalFeePercent: isNaN(val) ? 0 : val }));
                    }}
                  />
                </div>
              </div>
            )}

            {activeSettingsTab === 'policy' && (
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Delivery Policy Text</label>
                <textarea
                  rows={3}
                  className="w-full bg-background border border-border rounded p-3 text-sm"
                  value={instSettings.deliveryPolicy}
                  onChange={(e) => setInstSettings(prev => ({ ...prev, deliveryPolicy: e.target.value }))}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAILS OVERLAY */}
      {selectedItem && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-[600px] rounded md:rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Detailed Information</h2>
              <button onClick={() => setSelectedItem(null)} className="text-white/80 hover:text-white"><FaTimesCircle size={24} /></button>
            </div>

            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
              {activeTab === 'installments' ? (
                <>
                  <div className="flex flex-col gap-6">
                    <div>
                      <h4 className="text-[0.65rem] font-bold text-muted-foreground uppercase mb-2">Customer Info</h4>
                      <p className="font-bold text-base md:text-lg">{selectedItem.customerName || selectedItem.payerInfo?.fullName || 'N/A'}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">{selectedItem.userEmail || selectedItem.payerInfo?.email || 'N/A'}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">{selectedItem.customerPhone || selectedItem.payerInfo?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-[0.65rem] font-bold text-muted-foreground uppercase mb-2">Product Info</h4>
                      {(() => {
                        const productData = products.find(p => p.id === selectedItem.productId);
                        const basePrice = selectedItem.basePrice || productData?.price;
                        return (
                          <div className="space-y-1">
                            <p className="font-bold text-sm md:text-base leading-tight">{selectedItem.productName || selectedItem.product?.name || 'Product deleted'}</p>
                            <p className="text-sm md:text-base text-primary font-bold">₦{(selectedItem.product?.price || selectedItem.totalAmount || 0).toLocaleString()}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-muted p-6 rounded-lg space-y-4">
                    <h4 className="text-xs font-bold uppercase flex items-center gap-2"><FaWallet /> Payment Plan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex flex-row items-center border-b border-border pb-2 gap-2">
                        <span className="text-muted-foreground shrink-0">Down Payment:</span>
                        <span className="font-bold">₦{(selectedItem.downPaymentPaid || selectedItem.downPayment || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-row items-center border-b border-border pb-2 gap-2">
                        <span className="text-muted-foreground shrink-0">Monthly:</span>
                        <span className="font-bold">₦{(selectedItem.monthlyAmount || Math.round(((selectedItem.product?.price || selectedItem.totalAmount || 0) - (selectedItem.downPaymentPaid || selectedItem.downPayment || 0)) / (selectedItem.planMonths || selectedItem.months || 1))).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-row items-center border-b border-border pb-2 gap-2">
                        <span className="text-muted-foreground shrink-0">Duration:</span>
                        <span className="font-bold">{selectedItem.planMonths || selectedItem.months || 'N/A'} Months</span>
                      </div>
                      <div className="flex flex-row items-center border-b border-border pb-2 gap-2">
                        <span className="text-muted-foreground shrink-0">Status:</span>
                        <span className={`font-bold uppercase ${selectedItem.status === 'cancelled' ? 'text-secondary' : 'text-green-600'}`}>{selectedItem.status}</span>
                      </div>
                    </div>
                  </div>

                  {(selectedItem.status === 'cancelling' || selectedItem.status === 'cancelled') && selectedItem.refundDetails && (
                    <div className="p-6 border-2 border-secondary rounded-lg bg-secondary/5">
                      <h4 className="text-secondary font-bold mb-4 flex items-center gap-2"><FaExclamationCircle /> REFUND REQUIRED</h4>
                      <div className="space-y-3 text-sm">
                        <p><strong>Account Name:</strong> {selectedItem.refundDetails.accountName || 'N/A'}</p>
                        <p><strong>Account Number:</strong> {selectedItem.refundDetails.accountNumber || 'N/A'}</p>
                        <p><strong>Bank Name:</strong> {selectedItem.refundDetails.bankName || 'N/A'}</p>
                        <p className="text-lg font-bold text-secondary mt-4">Payback Amount: ₦{selectedItem.refundDetails.refundAmount?.toLocaleString()}</p>

                        {!selectedItem.isRefunded && selectedItem.status !== 'cleared' && (
                          showReceiptInput === selectedItem.id ? (
                            <div className="mt-4 p-4 border border-dashed border-secondary bg-background rounded-md">
                              <label className="block text-xs font-bold mb-2">Upload Payment Receipt Evidence (Required)</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                className="w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setShowReceiptInput(null); setReceiptFile(null); }}
                                  className="flex-1 bg-muted text-foreground py-2 rounded-md font-bold text-sm transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  disabled={!receiptFile}
                                  onClick={() => setShowPasskeyModal({ type: 'clearPayment', id: selectedItem.id })}
                                  className="flex-1 bg-primary text-white py-2 rounded-md font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
                                >
                                  Upload
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowReceiptInput(selectedItem.id)}
                              className="w-full bg-secondary text-white py-3 rounded-md font-bold mt-4 hover:bg-secondary/90 transition-colors"
                            >
                              I have completed payment
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {selectedItem.status === 'completed' && (
                    <div className="bg-primary/5 p-6 rounded-lg border border-primary/20 flex flex-col items-center text-center gap-4">
                      <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xl">
                        <FaCheckCircle />
                      </div>
                      <div>
                        <h4 className="font-bold text-primary">Payment Plan Completed!</h4>
                        <p className="text-xs text-primary/70">The final payment has been made. You can now process the shipment in the Orders section.</p>
                      </div>
                      <Link
                        href={`/admin/orders?search=${selectedItem.id}`}
                        className="w-full bg-primary text-white py-3 rounded-md font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors"
                      >
                        <FaShoppingBag /> View Final Order
                      </Link>
                    </div>
                  )}

                  <div className="bg-card p-6 rounded-lg border border-border space-y-4">
                    <button
                      onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                      className="w-full flex items-center justify-between text-xs font-bold uppercase text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-2"><FaHistory /> Payment History ({selectedItem.payments?.filter((p: any) => p.status === 'paid').length || 0} Paid)</span>
                      {showPaymentHistory ? <FaChevronUp /> : <FaChevronDown />}
                    </button>

                    {showPaymentHistory && (
                      <div className="space-y-3 pt-2">
                        {selectedItem.payments?.map((payment: any, idx: number) => (
                          <div key={idx} className="flex flex-col gap-2 p-3 rounded-md bg-muted/50 border border-border text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{payment.month === 1 ? 'Down Payment' : `Month ${payment.month - 1} Payment`}</span>
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {payment.status === 'paid' ? 'PAID' : 'PENDING'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                {payment.status === 'paid'
                                  ? `Paid on ${new Date(payment.paidAt?.seconds ? payment.paidAt.seconds * 1000 : (payment.paidAt instanceof Date ? payment.paidAt.getTime() : payment.paidAt)).toLocaleDateString()}`
                                  : `Due ${new Date(payment.deadline?.seconds ? payment.deadline.seconds * 1000 : (payment.deadline instanceof Date ? payment.deadline.getTime() : payment.deadline)).toLocaleDateString()}`}
                              </span>
                              {payment.status === 'paid' && (
                                <button
                                  onClick={() => setShowReceipt(payment.receiptId)}
                                  className="text-primary hover:underline font-bold flex items-center gap-1"
                                >
                                  <FaReceipt /> View Receipt
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-card p-6 rounded-lg border border-border space-y-4 shadow-sm">
                    <h4 className="text-xs font-bold uppercase flex items-center gap-2 text-primary"><FaWallet /> Financial Breakdown</h4>
                    {(() => {
                      const productData = products.find(p => p.id === selectedItem.productId);
                      const basePrice = selectedItem.basePrice || productData?.price || 0;
                      const totalAmount = selectedItem.totalAmount || selectedItem.product?.price || 0;
                      const interestAmount = Math.max(0, totalAmount - basePrice);
                      const interestPercent = basePrice > 0 ? Math.round((interestAmount / basePrice) * 100) : 0;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-sm">
                          <div className="flex flex-row md:flex-col items-center md:items-start gap-2 md:gap-1 border-b md:border-0 border-border pb-2 md:pb-0">
                            <span className="text-muted-foreground shrink-0">Original Price:</span>
                            <span className="font-bold text-base md:text-lg">₦{basePrice.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-row md:flex-col items-center md:items-start gap-2 md:gap-1 border-b md:border-0 border-border pb-2 md:pb-0">
                            <span className="text-muted-foreground shrink-0">Interest ({interestPercent}%):</span>
                            <span className="font-bold text-base md:text-lg text-secondary">+ ₦{interestAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-row md:flex-col items-center md:items-start gap-2 md:gap-1">
                            <span className="text-muted-foreground shrink-0">Total Plan Cost:</span>
                            <span className="font-bold text-base md:text-lg text-primary">₦{totalAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-row gap-2 md:gap-4">
                    <button onClick={() => handleAction('whatsapp', selectedItem.payerInfo?.phone || selectedItem.customerPhone)} className="flex-1 bg-[#25D366] text-white py-3 md:py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#25D366]/20">
                      <FaWhatsapp size={20} /> <span className="hidden md:inline">WhatsApp</span>
                    </button>
                    <button onClick={() => handleAction('call', selectedItem.payerInfo?.phone || selectedItem.customerPhone)} className="flex-1 bg-primary text-white py-3 md:py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20">
                      <FaPhoneAlt size={18} /> <span className="hidden md:inline">Call Direct</span>
                    </button>
                    <button onClick={() => handleAction('email', selectedItem.payerInfo?.email || selectedItem.userEmail)} className="flex-1 bg-muted border border-border py-3 md:py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-sm hover:bg-muted/80">
                      <FaEnvelope size={18} /> <span className="hidden md:inline">Email</span>
                    </button>
                  </div>

                  {selectedItem.status === 'completed' && (
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => setShowFinalReceipt(selectedItem)}
                        className="flex-[4] bg-emerald-600 text-white py-3 rounded-md font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
                      >
                        <FaPrint /> View Final Receipt
                      </button>
                      <button
                        onClick={() => setShowPasskeyModal({ type: 'deleteSettled', id: selectedItem.id })}
                        className="flex-1 bg-red-100 text-red-600 py-3 rounded-md font-bold flex items-center justify-center hover:bg-red-200 transition-colors"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">From: {selectedItem.name}</h4>
                    <p className="text-lg leading-relaxed bg-muted p-6 rounded-lg italic border-l-4 border-primary">"{selectedItem.message}"</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => handleAction('whatsapp', selectedItem.phone)} className="flex-1 bg-[#25D366] text-white py-3 rounded-md font-bold flex items-center justify-center gap-2"><FaWhatsapp /> WhatsApp</button>
                    <button onClick={() => handleAction('call', selectedItem.phone)} className="flex-1 bg-primary text-white py-3 rounded-md font-bold flex items-center justify-center gap-2"><FaPhoneAlt /> Call</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* PASSKEY MODAL */}
      {showPasskeyModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card p-8 rounded-xl shadow-2xl w-full max-w-sm text-center border border-border">
            <FaLock className="mx-auto text-4xl text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">CEO Passkey Required</h3>
            <p className="text-sm text-muted-foreground mb-6">Enter the CEO passcode to authorize this action.</p>
            <input
              type="password"
              autoFocus
              className="w-full p-4 rounded-md border border-border bg-background text-center text-2xl tracking-widest mb-6"
              value={passkeyInput}
              onChange={(e) => setPasskeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyPasskey(showPasskeyModal.type, showPasskeyModal.id)}
            />
            <div className="flex gap-4">
              <button onClick={() => { setShowPasskeyModal(null); setPasskeyInput(''); }} className="flex-1 py-3 font-bold border border-border rounded-md hover:bg-muted transition-colors">Cancel</button>
              <button 
                disabled={isVerifying}
                onClick={() => verifyPasskey(showPasskeyModal.type, showPasskeyModal.id)} 
                className={`flex-1 py-3 font-bold bg-primary text-white rounded-md transition-colors ${isVerifying ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary-hover'}`}
              >
                {isVerifying ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECEIPT MODAL ── */}
      {showReceipt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0 print:block">
          <div className="bg-card rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-border print:border-none print:shadow-none print:mx-auto print:rounded-none print-modal-content">
            {loadingReceipt ? (
              <div className="p-20 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Loading receipt...</p>
              </div>
            ) : receiptData ? (
              <div className="relative">
                <div className="p-6 bg-slate-50 border-b border-dashed border-slate-200 relative">
                  <button onClick={() => setShowReceipt(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10"><FaTimes size={18} /></button>
                  <div className="text-center">
                    <div className="relative w-12 h-12 mx-auto mb-1">
                      <Image src="/logos.png" alt="Logo" fill className="object-contain" sizes="48px" />
                    </div>
                    <h2 className="text-lg font-black text-[#D48806] tracking-tighter uppercase">Quick Choice®</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Official Payment Receipt</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">ID: {receiptData.id?.substring(0, 10).toUpperCase()}</span>
                      <div className="bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Admin Copy
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Customer:</div>
                    <div className="font-bold text-xs text-slate-800 text-right max-w-[180px] break-all">{receiptData.userEmail || receiptData.email}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Reference:</div>
                    <div className="font-bold text-xs text-slate-800">{receiptData.paymentName === 'Initial Deposit' ? 'Deposit' : receiptData.paymentName}</div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Product:</div>
                    <div className="font-bold text-xs text-slate-800 text-right max-w-[180px]">{receiptData.productName}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Date:</div>
                    <div className="font-bold text-xs text-slate-800">
                      {new Date(receiptData.createdAt?.seconds ? receiptData.createdAt.seconds * 1000 : receiptData.createdAt).toLocaleDateString('en-GB')}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t-2 border-slate-800 flex justify-between items-center">
                    <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Paid:</div>
                    <div className="text-2xl font-black text-primary">₦{receiptData.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-2 bg-green-50 rounded-lg border border-green-100 mt-2">
                    <FaCheckCircle className="text-green-500" size={12} />
                    <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Payment Verified</span>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 text-center space-y-1 border-t border-slate-200">
                  <p className="text-[9px] font-bold text-slate-800 uppercase tracking-tight">Thank you for choosing Quick Choice®!</p>
                  <p className="text-[8px] text-slate-400 font-medium">168, Akarigbo Road, Sabo Sagamu, Ogun State.</p>
                  <button onClick={handlePrintAdminReceipt} className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-all hover:bg-slate-700">
                    <FaPrint size={12} /> Print Admin Record
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center">
                <p>Receipt not found.</p>
                <button onClick={() => setShowReceipt(null)} className="mt-4 text-primary font-bold">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FINAL COMPLETION RECEIPT MODAL ── */}
      {showFinalReceipt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl border border-border">
            <div className="relative">
              <div className="p-6 bg-slate-50 border-b border-dashed border-slate-200 relative">
                <button onClick={() => setShowFinalReceipt(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10"><FaTimes size={18} /></button>
                <div className="text-center">
                  <div className="relative w-12 h-12 mx-auto mb-1">
                    <Image src="/logos.png" alt="Logo" fill className="object-contain" sizes="48px" />
                  </div>
                  <h2 className="text-lg font-black text-[#D48806] tracking-tighter uppercase">Quick Choice®</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Official Completion Receipt</p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">ID: FINAL-{showFinalReceipt.id?.substring(0, 6).toUpperCase()}</span>
                    <div className="bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Admin Copy
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Customer:</span>
                    <span className="text-xs font-black text-slate-800 text-right max-w-[200px] break-all">{showFinalReceipt.userEmail || showFinalReceipt.payerInfo?.email}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Product:</span>
                    <span className="text-xs font-black text-slate-800 text-right">{showFinalReceipt.productName}</span>
                  </div>
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Plan:</span>
                    <span className="text-xs font-black text-slate-800">{showFinalReceipt.planMonths} Months</span>
                  </div>

                  <div className="pt-2 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Base Price:</span>
                      <span className="font-bold text-slate-600">₦{(showFinalReceipt.basePrice || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Interest/Fees:</span>
                      <span className="font-bold text-secondary text-[11px]">+₦{((showFinalReceipt.totalAmount || 0) - (showFinalReceipt.basePrice || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-800">
                      <span className="text-slate-800 font-black uppercase text-[10px]">Total Paid:</span>
                      <span className="font-black text-[#D48806] text-xl">₦{(showFinalReceipt.totalAmountPaid || showFinalReceipt.totalAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-black text-[10px] uppercase tracking-widest">
                    <FaCheckCircle size={14} /> Loan Fully Cleared
                  </div>
                  <span className="text-[8px] font-bold text-emerald-600 uppercase">Completed on: {new Date(showFinalReceipt.completedAt?.seconds ? showFinalReceipt.completedAt.seconds * 1000 : (showFinalReceipt.completedAt || Date.now())).toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              <div className="p-6 bg-slate-50 text-center space-y-1 border-t border-slate-200">
                <p className="text-[9px] font-bold text-slate-800 uppercase tracking-tight">Thank you for choosing Quick Choice®!</p>
                <p className="text-[8px] text-slate-400 font-medium">168, Akarigbo Road, Sabo Sagamu, Ogun State.</p>
                <button onClick={() => handlePrintFinalAdminReceipt(showFinalReceipt)} className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-all hover:bg-slate-700">
                  <FaPrint size={12} /> Print Official Admin Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[1900] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border-2 border-secondary/20">
            <div className="w-20 h-20 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <FaTrash size={40} />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-foreground">Confirm Deletion</h3>
            <p className="text-muted-foreground mb-8">
              Are you sure you want to delete this {confirmDelete.type === 'deleteComplaint' ? 'complaint' : 'record'}?
              This action cannot be undone and will permanently remove it from the database.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 font-bold border border-border rounded-xl hover:bg-muted transition-all"
              >
                No, Keep it
              </button>
              <button
                onClick={() => {
                  const data = confirmDelete;
                  setConfirmDelete(null);
                  setShowPasskeyModal(data);
                }}
                className="flex-1 py-4 font-bold bg-secondary text-white rounded-xl hover:bg-secondary/90 shadow-lg shadow-secondary/20 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
