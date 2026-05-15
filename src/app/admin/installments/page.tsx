'use client';

import { useState, useEffect } from 'react';
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
  FaSave
} from 'react-icons/fa';

export default function AdminInstallments() {
  const [activeTab, setActiveTab] = useState<'installments' | 'complaints' | 'settings'>('installments');
  const [installments, setInstallments] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showPasskeyModal, setShowPasskeyModal] = useState<{ type: string, id: string } | null>(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: string, id: string } | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'plans' | 'fees' | 'policy'>('plans');

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
  const [filter, setFilter] = useState<'all' | 'unsettled' | 'cleared' | 'vip'>('all');
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
    const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
    const correctPasskey = settingsDoc.data()?.passkey || 'admin1234';

    if (passkeyInput === correctPasskey) {
      if (actionType === 'deleteComplaint') {
        await deleteDoc(doc(db, 'complaints', id));
        toast.success('Complaint deleted.');
      } else if (actionType === 'clearPayment') {
        await updateDoc(doc(db, 'installments', id), {
          status: 'cleared',
          settledAt: new Date().toISOString()
        });
        toast.success('Payment marked as cleared.');
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
  };

  const markAsRead = async (item: any) => {
    if (item.isNew) {
      const collectionName = activeTab === 'installments' ? 'installments' : 'complaints';
      await updateDoc(doc(db, collectionName, item.id), { isNew: false });
    }
    setSelectedItem(item);
  };

  const filteredInstallments = installments.filter(inst => {
    const matchesSearch = (inst.product?.name || inst.productName || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'unsettled') return inst.status === 'cancelled' && !inst.isRefunded;
    if (filter === 'cleared') return inst.status === 'cleared' || (inst.status === 'cancelled' && inst.isRefunded);
    if (filter === 'vip') return inst.status === 'completed';
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
              {['all', 'unsettled', 'cleared', 'vip'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full border text-[0.7rem] md:text-sm font-bold capitalize transition-all ${filter === f ? 'bg-primary text-white border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary'}`}
                >
                  {f === 'unsettled' ? 'Unsettled' : f}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0 pb-10">
              {filteredInstallments.map(inst => (
                <div
                  key={inst.id}
                  onClick={() => markAsRead(inst)}
                  className={`bg-card p-4 md:p-6 rounded-[var(--radius)] border-2 cursor-pointer transition-all hover:shadow-lg relative overflow-hidden
                    ${inst.status === 'cancelled' && !inst.isRefunded ? 'border-secondary animate-[pulse_2s_infinite]' : 'border-border'}
                    ${inst.isNew ? 'border-green-500 animate-[pulse_2.5s_infinite]' : ''}
                  `}
                >
                  {inst.isNew && <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] px-2 py-0.5 font-bold rounded-bl-lg">NEW</div>}
                  {inst.status === 'cancelled' && <div className="absolute top-0 right-0 bg-secondary text-white text-[9px] px-2 py-0.5 font-bold rounded-bl-lg">CANCELLED</div>}

                  <div className="flex items-center gap-3 md:gap-4 mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted flex items-center justify-center text-primary">
                      <FaUser size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold leading-tight text-sm md:text-base truncate">{inst.customerName || inst.payerInfo?.fullName || 'Unknown'}</h3>
                      <p className="text-[0.65rem] md:text-xs text-muted-foreground truncate">
                        {inst.productName || inst.product?.name || 'Product deleted'}
                        {(inst.basePrice || inst.product?.price) && (
                          <span className="ml-2 text-[0.6rem] text-muted-foreground opacity-60 font-medium">
                            Orig: ₦{(inst.basePrice || inst.product?.price).toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-[0.8rem] md:text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Down Payment:</span>
                      <span className="font-bold text-primary">₦{(inst.downPaymentPaid || inst.downPayment || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-bold">{inst.months} Months</span>
                    </div>
                    {inst.isNew && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAsRead(inst); }}
                        className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white py-2 rounded-md font-bold text-xs transition-colors"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
                      <p className="font-bold text-sm md:text-base">{selectedItem.productName || selectedItem.product?.name || 'Product deleted'}</p>
                      <p className="text-sm text-primary font-bold">₦{(selectedItem.product?.price || selectedItem.totalAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-muted p-6 rounded-lg space-y-4">
                    <h4 className="text-xs font-bold uppercase flex items-center gap-2"><FaWallet /> Payment Plan</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between border-b border-border pb-2">
                        <span>Down Payment:</span>
                        <span className="font-bold">₦{(selectedItem.downPaymentPaid || selectedItem.downPayment || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-2">
                        <span>Monthly:</span>
                        <span className="font-bold">₦{(selectedItem.monthlyAmount || Math.round(((selectedItem.product?.price || selectedItem.totalAmount || 0) - (selectedItem.downPaymentPaid || selectedItem.downPayment || 0)) / (selectedItem.planMonths || selectedItem.months || 1))).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-2">
                        <span>Duration:</span>
                        <span className="font-bold">{selectedItem.planMonths || selectedItem.months || 'N/A'} Months</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-2">
                        <span>Status:</span>
                        <span className={`font-bold uppercase ${selectedItem.status === 'cancelled' ? 'text-secondary' : 'text-green-600'}`}>{selectedItem.status}</span>
                      </div>
                    </div>
                  </div>

                  {selectedItem.status === 'cancelled' && (
                    <div className="p-6 border-2 border-secondary rounded-lg bg-secondary/5">
                      <h4 className="text-secondary font-bold mb-4 flex items-center gap-2"><FaExclamationCircle /> REFUND REQUIRED</h4>
                      <div className="space-y-3 text-sm">
                        <p><strong>Account Name:</strong> {selectedItem.refundInfo?.accountName || 'N/A'}</p>
                        <p><strong>Account Number:</strong> {selectedItem.refundInfo?.accountNumber || 'N/A'}</p>
                        <p><strong>Bank Name:</strong> {selectedItem.refundInfo?.bankName || 'N/A'}</p>
                        <p className="text-lg font-bold text-secondary mt-4">Payback Amount: ₦{selectedItem.downPayment?.toLocaleString()}</p>

                        {!selectedItem.isRefunded && (
                          <button
                            onClick={() => setShowPasskeyModal({ type: 'clearPayment', id: selectedItem.id })}
                            className="w-full bg-secondary text-white py-3 rounded-md font-bold mt-4"
                          >
                            Mark Refund as Completed
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <button onClick={() => handleAction('whatsapp', selectedItem.payerInfo?.phone)} className="flex-1 bg-[#25D366] text-white py-3 rounded-md font-bold flex items-center justify-center gap-2 text-sm"><FaWhatsapp /> WhatsApp</button>
                    <button onClick={() => handleAction('call', selectedItem.payerInfo?.phone)} className="flex-1 bg-primary text-white py-3 rounded-md font-bold flex items-center justify-center gap-2 text-sm"><FaPhoneAlt /> Call Direct</button>
                    <button onClick={() => handleAction('email', selectedItem.payerInfo?.email)} className="flex-1 bg-muted border border-border py-3 rounded-md font-bold flex items-center justify-center gap-2 text-sm"><FaEnvelope /> Email</button>
                  </div>

                  {selectedItem.status === 'completed' && (
                    <button onClick={() => window.print()} className="w-full bg-accent text-white py-3 rounded-md font-bold flex items-center justify-center gap-2"><FaPrint /> Print Receipt</button>
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
              <button onClick={() => verifyPasskey(showPasskeyModal.type, showPasskeyModal.id)} className="flex-1 py-3 font-bold bg-primary text-white rounded-md hover:bg-primary-hover transition-colors">Confirm</button>
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
