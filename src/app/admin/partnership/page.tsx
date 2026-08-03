'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { toast, Toaster } from 'react-hot-toast';
import { FaHandshake, FaCheck, FaTimes, FaTrash, FaUserTie, FaCog, FaLink, FaWhatsapp } from 'react-icons/fa';
import { useAdmin } from '@/hooks/useAdmin';

export default function AdminPartnership() {
  const { isCEO } = useAdmin();
  const [partners, setPartners] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [loading, setLoading] = useState(true);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('all');

  // Settings state
  const [globalPercentage, setGlobalPercentage] = useState<number>(50);
  const [vipPercentage, setVipPercentage] = useState<number>(20);
  const [showSettings, setShowSettings] = useState(false);
  const [ceoPasskey, setCeoPasskey] = useState('');

  // Modals state
  const [deletePartnerId, setDeletePartnerId] = useState<string | null>(null);
  const [payOutstandingPartner, setPayOutstandingPartner] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // History State
  const [selectedPartnerForHistory, setSelectedPartnerForHistory] = useState<any>(null);
  const [partnerHistory, setPartnerHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryPasskey, setShowHistoryPasskey] = useState(false);

  useEffect(() => {
    // Fetch settings
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'partnership'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.globalPercentage !== undefined) setGlobalPercentage(data.globalPercentage);
        if (data.vipPercentage !== undefined) setVipPercentage(data.vipPercentage);
      }
    };
    fetchSettings();

    // Listen to partners
    const q = query(collection(db, 'partners'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const p = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPartners(p);
      setLoading(false);
    }, (error) => {
      console.warn("Partners listener error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleApprove = async (partner: any) => {
    setActionLoading(true);
    try {
      const code = generateReferralCode();
      const referralLink = `https://nomo-stores.com/?ref=${code}`;

      await updateDoc(doc(db, 'partners', partner.id), {
        status: 'approved',
        referralCode: code,
        referralLink: referralLink,
        approvedAt: new Date().toISOString()
      });
      toast.success('Partner approved successfully.');
    } catch (error) {
      toast.error('Failed to approve partner.');
    } finally {
      setActionLoading(false);
    }
  };
  const handleToggleVip = async (partner: any) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'partners', partner.id), {
        isVip: !partner.isVip
      });
      toast.success(`Partner ${!partner.isVip ? 'marked as VIP' : 'removed from VIP'}.`);
    } catch (error) {
      toast.error('Failed to update VIP status.');
    } finally {
      setActionLoading(false);
    }
  };
  const handleReject = async (id: string) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'partners', id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
      toast.success('Partner rejected.');
    } catch (error) {
      toast.error('Failed to reject partner.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayOutstanding = async () => {
    if (!ceoPasskey) return toast.error('CEO Password required.');
    const partner = payOutstandingPartner;
    if (!partner) return;
    setActionLoading(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const currentPasskey = settingsDoc.data()?.passkey || 'admin1234';

      if (ceoPasskey !== currentPasskey) {
        toast.error('Incorrect CEO Password.');
        setActionLoading(false);
        return;
      }

      const q = query(collection(db, 'orders'), where('referralCode', '==', partner.referralCode));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.partnerPaid) {
          batch.update(d.ref, { partnerPaid: true });
        }
      });
      
      batch.update(doc(db, 'partners', partner.id), { outstandingEarnings: 0 });
      await batch.commit();
      
      toast.success('Outstanding balance marked as paid.');
      setPayOutstandingPartner(null);
      setCeoPasskey('');
    } catch (error) {
      toast.error('Failed to pay outstanding.');
    } finally {
      setActionLoading(false);
    }
  };

  const openHistory = async (partner: any) => {
    setSelectedPartnerForHistory(partner);
    setHistoryLoading(true);
    try {
      const q = query(collection(db, 'orders'), where('referralCode', '==', partner.referralCode));
      const snap = await getDocs(q);
      const items: any[] = [];
      snap.docs.forEach(d => {
        const order = d.data();
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const sellPrice = item.price || 0;
            const costPrice = item.rdpPrice || item.costPrice || 0;
            const profit = Math.max(0, sellPrice - costPrice);
            const cutPct = order.partnerCutPercentage || 50;
            const partnerCut = profit * (cutPct / 100);
            items.push({
              id: d.id,
              name: item.name,
              partnerCut,
              partnerPaid: order.partnerPaid || false,
              createdAt: order.createdAt
            });
          });
        }
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPartnerHistory(items);
    } catch (error) {
      toast.error('Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSuperDeleteHistory = async () => {
    if (!ceoPasskey) return toast.error('CEO Password required.');
    setActionLoading(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const currentPasskey = settingsDoc.data()?.passkey || 'admin1234';

      if (ceoPasskey !== currentPasskey) {
        toast.error('Incorrect CEO Password.');
        setActionLoading(false);
        return;
      }

      // Delete only cleared transactions (where partnerPaid == true)
      const q = query(collection(db, 'orders'), where('referralCode', '==', selectedPartnerForHistory.referralCode), where('partnerPaid', '==', true));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      
      snap.docs.forEach(d => {
        batch.delete(d.ref); // Completely delete the order from Firestore
      });
      
      await batch.commit();
      
      toast.success('Cleared history deleted from Firestore.');
      setShowHistoryPasskey(false);
      setCeoPasskey('');
      // Refresh history view
      openHistory(selectedPartnerForHistory);
    } catch (error) {
      toast.error('Failed to delete history.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePartnerId) return;
    if (!ceoPasskey) return toast.error('CEO Password required.');

    setActionLoading(true);
    try {
      // Verify CEO Password
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const currentPasskey = settingsDoc.data()?.passkey || 'admin1234';

      if (ceoPasskey !== currentPasskey) {
        toast.error('Incorrect CEO Password.');
        setActionLoading(false);
        return;
      }

      await deleteDoc(doc(db, 'partners', deletePartnerId));
      toast.success('Partner deleted successfully.');
      setDeletePartnerId(null);
      setCeoPasskey('');
    } catch (error) {
      toast.error('Failed to delete partner.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!ceoPasskey) return toast.error('CEO Password required.');

    setActionLoading(true);
    try {
      // Verify CEO Password
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const currentPasskey = settingsDoc.data()?.passkey || 'admin1234';

      if (ceoPasskey !== currentPasskey) {
        toast.error('Incorrect CEO Password.');
        setActionLoading(false);
        return;
      }

      await setDoc(doc(db, 'settings', 'partnership'), {
        globalPercentage: Number(globalPercentage),
        vipPercentage: Number(vipPercentage)
      }, { merge: true });

      toast.success('Partnership percentage updated.');
      setShowSettings(false);
      setCeoPasskey('');
    } catch (error) {
      toast.error('Failed to update settings.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingPartners = partners.filter(p => p.status === 'pending');
  const approvedPartners = partners.filter(p => p.status === 'approved');

  let baseList = activeTab === 'pending' ? pendingPartners : approvedPartners;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    baseList = baseList.filter(p => 
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.accountName && p.accountName.toLowerCase().includes(q)) ||
      (p.phoneNumber && p.phoneNumber.toLowerCase().includes(q)) ||
      (p.referralCode && p.referralCode.toLowerCase().includes(q))
    );
  }

  if (filterOption === 'highest_paid') {
    baseList = [...baseList].sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0));
  } else if (filterOption === 'vips') {
    baseList = baseList.filter(p => p.isVip);
  } else if (filterOption === 'non_vips') {
    baseList = baseList.filter(p => !p.isVip);
  }

  const displayedPartners = baseList;

  return (
    <AdminGuard>

      <div className="max-w-[1200px] mx-auto  md:px-4 md:px-0 space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <FaHandshake className="text-primary" /> Partnership Program
            </h1>
            <p className="md:text-sm text-xs text-muted-foreground md:mt-1 mt-0">Manage partners, approvals, and referral cuts.</p>
          </div>

          <div>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-muted text-foreground border border-border px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-muted/80 transition-colors"
            >
              <FaCog /> Settings
            </button>

          </div>
        </header>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 px-4">
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-sm p-6">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><FaUserTie className="text-secondary" /> Partnership Settings</h3>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold block mb-1 text-muted-foreground">Global Cut (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={globalPercentage}
                      onChange={e => setGlobalPercentage(Number(e.target.value))}
                      className="w-full p-3 rounded-md border border-border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1 text-muted-foreground">VIP Cut (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={vipPercentage}
                      onChange={e => setVipPercentage(Number(e.target.value))}
                      className="w-full p-3 rounded-md border border-border bg-background text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-muted-foreground text-red-500">CEO Password Required</label>
                  <input
                    type="password"
                    value={ceoPasskey}
                    onChange={e => setCeoPasskey(e.target.value)}
                    placeholder="Enter CEO password"
                    className="w-full p-3 rounded-md border border-red-200 bg-background text-sm focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowSettings(false); setCeoPasskey(''); }}
                  className="flex-1 py-2 rounded-md border border-border font-bold hover:bg-muted text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSettings}
                  disabled={actionLoading || !ceoPasskey}
                  className="flex-1 py-2 rounded-md bg-secondary text-white font-bold hover:bg-secondary/90 text-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deletePartnerId && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 px-4">
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="text-red-500 mb-4 flex justify-center"><FaTrash size={40} /></div>
              <h3 className="font-bold text-xl mb-2">Delete Partner?</h3>
              <p className="text-sm text-muted-foreground mb-4">This will permanently remove the partner and their referral code.</p>

              <div className="mb-6 text-left">
                <label className="text-xs font-bold block mb-1 text-muted-foreground text-red-500">CEO Password Required</label>
                <input
                  type="password"
                  value={ceoPasskey}
                  onChange={e => setCeoPasskey(e.target.value)}
                  placeholder="Enter CEO password"
                  className="w-full p-3 rounded-md border border-red-200 bg-background text-sm focus:border-red-500 outline-none text-center"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setDeletePartnerId(null); setCeoPasskey(''); }} className="flex-1 py-2 rounded-md border border-border font-bold hover:bg-muted text-sm">Cancel</button>
                <button onClick={handleDelete} disabled={actionLoading || !ceoPasskey} className="flex-1 py-2 rounded-md bg-red-600 text-white font-bold hover:bg-red-700 text-sm disabled:opacity-50">
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors relative ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            Pending Requests
            {pendingPartners.length > 0 && (
              <span className="ml-2 bg-secondary text-white text-[10px] px-2 py-0.5 rounded-full">{pendingPartners.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'approved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            Registered Partners
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-2">
          <input
            type="text"
            placeholder="Search by email, name, phone, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 p-3 rounded-md border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
          />
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value)}
            className="p-3 rounded-md border border-border bg-background text-sm min-w-[200px] outline-none focus:border-primary transition-colors font-semibold"
          >
            <option value="all">All Partners</option>
            <option value="highest_paid">Highest Paid</option>
            <option value="vips">VIPs Only</option>
            <option value="non_vips">Non-VIPs Only</option>
          </select>
        </div>

        {/* List Content */}
        <section className="bg-card rounded-[var(--radius)] border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading partners...</div>
          ) : displayedPartners.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <FaHandshake size={40} className="mb-4 opacity-20" />
              <p>No {activeTab} partners found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2 md:p-6 bg-muted/20">
              {displayedPartners.map(partner => (
                <div key={partner.id} className="bg-card border border-border md:rounded-xl rounded-lg p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                  {/* Top: User Info */}
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <img src={partner.photoURL || '/images/placeholder.png'} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-border shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-foreground text-sm truncate">{partner.email}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Registered User</div>
                    </div>
                  </div>

                  {/* Middle: Bank Details */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Bank Details</div>
                    <div className="text-sm font-semibold text-gray-400 capitalize">
                      {partner.bankName ? partner.bankName.trim().replace(/\s+bank$/i, '') + ' Bank' : 'N/A'}
                    </div>
                    <div className="-mt-2 text-sm font-bold text-foreground truncate capitalize">{partner.accountName}</div>
                    <div className="text-sm font-mono bg-muted px-2 py-1 rounded-md w-fit border border-border font-bold tracking-widest">{partner.accountNumber}</div>
                    {partner.phoneNumber && (
                      <a
                        href={`https://wa.me/${partner.phoneNumber.replace(/^0/, '234').replace(/^\+/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg w-fit transition-colors border border-green-200 mt-1"
                      >
                        <FaWhatsapp size={14} /> {partner.phoneNumber}
                      </a>
                    )}
                  </div>

                  {/* Approved Info */}
                  {activeTab === 'approved' && (
                    <div className="flex flex-col gap-3 mt-1 border-t border-border pt-3">
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-muted-foreground uppercase font-black tracking-wider">VIP Status</div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={!!partner.isVip} onChange={() => handleToggleVip(partner)} disabled={actionLoading} />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-muted-foreground uppercase font-black tracking-wider">Referral Code</div>
                        <div className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                          <FaLink /> {partner.referralCode}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-muted-foreground uppercase font-black tracking-wider">Outstanding</div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-green-600">
                            ₦{(partner.outstandingEarnings || 0).toLocaleString()}
                          </div>
                          <button
                            disabled={actionLoading || !partner.outstandingEarnings}
                            onClick={() => setPayOutstandingPartner(partner)}
                            className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-green-200 transition-colors disabled:opacity-50"
                          >
                            Paid Outstanding
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => openHistory(partner)}
                        className="text-xs font-bold text-blue-600 underline text-right w-full mt-2"
                      >
                        View History
                      </button>
                    </div>
                  )}

                  {/* Bottom: Actions */}
                  <div className="mt-auto pt-4 flex justify-end gap-3">
                    {activeTab === 'pending' ? (
                      <>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleApprove(partner)}
                          className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded-lg hover:bg-green-200 transition-colors font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <FaCheck size={14} /> Accept
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleReject(partner.id)}
                          className="flex-1 bg-red-100 text-red-700 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <FaTimes size={14} /> Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeletePartnerId(partner.id)}
                        className="w-full text-red-600 bg-red-50 hover:bg-red-100 py-2 px-3 rounded-lg transition-colors border border-red-100 flex items-center justify-center gap-2 font-bold text-sm"
                        title="Delete Partner"
                      >
                        <FaTrash size={14} /> Delete Account
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        {/* Pay Outstanding Confirmation Modal */}
        {payOutstandingPartner && (
          <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-16 h-16 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheck size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Mark as Paid?</h3>
              <p className="text-sm text-muted-foreground mb-2">
                You are about to mark all outstanding balance as paid for:
              </p>
              <p className="font-black text-base text-foreground mb-1">{payOutstandingPartner.accountName}</p>
              <p className="text-2xl font-black text-green-600 mb-4">
                ₦{(payOutstandingPartner.outstandingEarnings || 0).toLocaleString()}
              </p>
              
              <div className="mb-6">
                <p className="text-xs font-bold text-red-500 uppercase mb-2">Enter CEO Password to authorize</p>
                <input
                  type="password"
                  value={ceoPasskey}
                  onChange={e => setCeoPasskey(e.target.value)}
                  placeholder="CEO Password"
                  className="w-full p-3 rounded-xl border border-border bg-background text-sm text-center"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setPayOutstandingPartner(null); setCeoPasskey(''); }}
                  className="flex-1 py-3 rounded-xl font-bold text-sm border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayOutstanding}
                  disabled={actionLoading || !ceoPasskey}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Processing...' : 'Yes, Mark Paid'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Overlay */}
        {selectedPartnerForHistory && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-border">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="font-bold text-xl">
                  History - {selectedPartnerForHistory.accountName}
                </h3>
                <button onClick={() => { setSelectedPartnerForHistory(null); setShowHistoryPasskey(false); setCeoPasskey(''); }} className="text-muted-foreground hover:text-foreground">
                  <FaTimes size={20} />
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                {historyLoading ? (
                  <div className="text-center py-10 opacity-50">Loading history...</div>
                ) : partnerHistory.length === 0 ? (
                  <div className="text-center py-10 opacity-50">No history found.</div>
                ) : (
                  <div className="space-y-3">
                    {partnerHistory.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <div className="font-bold text-sm truncate max-w-[200px] md:max-w-[300px]">{item.name}</div>
                          <div className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                        </div>
                        <div className={`font-black ${item.partnerPaid ? 'text-red-500' : 'text-green-500'}`}>
                          ₦{(item.partnerCut || 0).toLocaleString()}
                          <div className="text-[10px] uppercase text-right opacity-70">
                            {item.partnerPaid ? 'Cleared' : 'Outstanding'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-border bg-muted/20">
                {!showHistoryPasskey ? (
                  <button
                    onClick={() => setShowHistoryPasskey(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors"
                  >
                    <FaTrash /> Super Delete Cleared History
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-bold text-red-500 uppercase">Enter CEO Password to clear all paid history permanently from Firestore</p>
                    <input
                      type="password"
                      value={ceoPasskey}
                      onChange={e => setCeoPasskey(e.target.value)}
                      placeholder="CEO Password"
                      className="w-full p-3 rounded-xl border border-border bg-background text-sm"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowHistoryPasskey(false)} className="flex-1 py-3 rounded-xl bg-muted font-bold text-sm">Cancel</button>
                      <button disabled={actionLoading || !ceoPasskey} onClick={handleSuperDeleteHistory} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50">
                        {actionLoading ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
