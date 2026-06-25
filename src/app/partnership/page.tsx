'use client';

import { useState, useEffect } from 'react';
import { useThemeStore, useHydrateTheme } from '@/store/useThemeStore';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaHandshake, FaShare, FaTimes, FaTrash, FaCheckCircle, FaUserCircle, FaSun, FaMoon, FaWhatsapp, FaEdit, FaPhone } from 'react-icons/fa';

export default function PartnershipPage() {
  const [user, setUser] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Application Form State
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [applying, setApplying] = useState(false);
  const [wasRejected, setWasRejected] = useState(false);

  // Edit Bank Info State
  const [showEditBank, setShowEditBank] = useState(false);
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // CEO Contact
  const [ceoPhone, setCeoPhone] = useState('');

  // Dashboard State
  const [showWelcome, setShowWelcome] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalItems: 0, companyProfit: 0, partnerProfit: 0 });

  // Dark Mode State — hydrate from localStorage on mount
  useHydrateTheme();
  const { isPartnershipDarkMode: isDarkMode, setIsPartnershipDarkMode: setIsDarkMode } = useThemeStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadPartnerData(u.uid);
      } else {
        setPartnerData(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadPartnerData = async (uid: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'partners', uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPartnerData(data);
        if (data.status === 'approved') {
          // Check if first time
          if (!localStorage.getItem(`welcomed_${uid}`)) {
            setShowWelcome(true);
            localStorage.setItem(`welcomed_${uid}`, 'true');
          }
          await loadReferralSales(data.referralCode);
        }
      } else {
        setPartnerData(null);
      }
    } catch (error) {
      console.error("Error loading partner data", error);
    } finally {
      setLoading(false);
    }
  };

  // Load CEO phone from settings
  useEffect(() => {
    const fetchCeoPhone = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setCeoPhone(data?.ceoInfo?.phone || '');
        }
      } catch (e) {
        console.warn('Could not load CEO phone', e);
      }
    };
    fetchCeoPhone();
  }, []);

  const loadReferralSales = async (referralCode: string) => {
    if (!referralCode) return;
    try {
      const q = query(collection(db, 'orders'), where('referralCode', '==', referralCode));
      const snap = await getDocs(q);
      const items: any[] = [];
      let totalCompany = 0;
      let totalPartner = 0;

      snap.forEach(doc => {
        const order = doc.data();
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const sellPrice = item.price || 0;
            const costPrice = item.rdpPrice || item.costPrice || 0;
            const profit = Math.max(0, sellPrice - costPrice);

            const cutPct = order.partnerCutPercentage || 50;
            const partnerCut = profit * (cutPct / 100);

            items.push({
              ...item,
              orderDate: order.createdAt,
              profit,
              partnerCut
            });

            totalCompany += profit;
            totalPartner += partnerCut;
          });
        }
      });

      setPurchasedItems(items);
      setStats({
        totalItems: items.length,
        companyProfit: totalCompany,
        partnerProfit: totalPartner
      });
    } catch (error) {
      console.error("Error loading referral sales", error);
    }
  };

  const handleApplyNow = async () => {
    if (!user) {
      try {
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(auth, provider);
        setUser(res.user);
        setShowApplyForm(true);
      } catch (error: any) {
        if (error.code !== 'auth/popup-closed-by-user') {
          toast.error('Failed to sign in with Google.');
        }
      }
    } else {
      setShowApplyForm(true);
    }
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber || !accountName || !phoneNumber) {
      return toast.error('All fields are required.');
    }

    if (accountNumber.length !== 10) {
      return toast.error('Account number must be exactly 10 digits.');
    }

    if (phoneNumber.length !== 11) {
      return toast.error('Phone number must be exactly 11 digits.');
    }

    setApplying(true);
    try {
      const data = {
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL,
        bankName,
        accountNumber,
        accountName,
        phoneNumber,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'partners', user.uid), data);
      setPartnerData(data);
      setShowApplyForm(false);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit application.');
    } finally {
      setApplying(false);
    }
  };

  const handleEditBankInfo = async () => {
    if (!editBankName || !editAccountNumber || !editPhoneNumber) {
      return toast.error('All fields are required.');
    }
    if (editAccountNumber.length !== 10) {
      return toast.error('Account number must be exactly 10 digits.');
    }
    if (editPhoneNumber.length !== 11) {
      return toast.error('Phone number must be exactly 11 digits.');
    }
    setEditSaving(true);
    try {
      await setDoc(doc(db, 'partners', user.uid), {
        bankName: editBankName,
        accountNumber: editAccountNumber,
        phoneNumber: editPhoneNumber,
      }, { merge: true });
      setPartnerData({ ...partnerData, bankName: editBankName, accountNumber: editAccountNumber, phoneNumber: editPhoneNumber });
      setShowEditBank(false);
      toast.success('Details updated successfully!');
    } catch (error) {
      toast.error('Failed to update details.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleShare = () => {
    if (!partnerData?.referralLink) return;
    if (navigator.share) {
      navigator.share({
        title: 'Join me and shop!',
        url: partnerData.referralLink
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(partnerData.referralLink);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your partnership account? This will permanently remove your referral code, link, and earnings data.')) return;

    try {
      await deleteDoc(doc(db, 'partners', user.uid));
      setPartnerData(null);
      toast.success('Partnership account deleted.');
    } catch (error) {
      toast.error('Failed to delete account.');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[70vh] flex flex-col items-center justify-center ${isDarkMode ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className={`${isDarkMode ? 'text-zinc-400' : 'text-muted-foreground'} font-bold animate-pulse`}>Loading Partnership Portal...</p>
      </div>
    );
  }

  // --- Theme Toggle Button (floating) ---
  const ThemeToggle = () => (
    <button
      onClick={() => setIsDarkMode(!isDarkMode)}
      className={`fixed bottom-6 right-6 z-50 p-2.5 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center ${isDarkMode ? 'bg-zinc-800 text-yellow-400 border border-zinc-700' : 'bg-white text-slate-800 border border-slate-200'
        }`}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDarkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
    </button>
  );

  // --- UNAUTHENTICATED OR NO PARTNER DATA VIEW ---
  if (!partnerData) {
    return (
      <div className={`min-h-[80vh] flex items-center justify-center py-12 px-2 md:px-4 transition-colors duration-300 ${isDarkMode ? 'bg-zinc-950' : 'bg-slate-50'}`}>
        <ThemeToggle />
        <div className={`max-w-4xl w-full rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2 animate-in fade-in slide-in-from-bottom-8 ${isDarkMode ? 'bg-zinc-900 border border-zinc-800 shadow-black/50' : 'bg-white border border-border'}`}>
          <div className="px-6 py-8 md:p-14 flex flex-col justify-center">
            <h1 className={`text-4xl font-black mb-6 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Grow with Us. <br /><span className="text-primary">Become a Partner.</span>
            </h1>
            <p className={`mb-8 leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
              Join our exclusive partnership program. Refer customers to our store using your unique link and earn up to 50% of the profits on every successful sale.
            </p>
            <ul className="space-y-4 mb-10">
              <li className={`flex items-center gap-3 font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                <FaCheckCircle className="text-primary" /> Zero signup fees
              </li>
              <li className={`flex items-center gap-3 font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                <FaCheckCircle className="text-primary" /> Track your earnings in real-time
              </li>
              <li className={`flex items-center gap-3 font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                <FaCheckCircle className="text-primary" /> Fast payouts directly to your bank
              </li>
            </ul>
            <button
              onClick={handleApplyNow}
              className="bg-primary text-white py-4 px-8 rounded-full font-bold text-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/30 flex items-center justify-center gap-3 w-fit"
            >
              {wasRejected ? 'Reapply' : 'Apply Now'} <FaHandshake size={20} />
            </button>
          </div>
          <div className="bg-white lex items-center justify-center">
            <img src="/images/environment.jpeg" alt="Partnership" className="w-full h-full object-cover shadow-2xl" />
          </div>
        </div>

        {/* APPLY OVERLAY FORM */}
        {showApplyForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in">
            <div className={`rounded-2xl shadow-2xl w-full max-w-sm p-5 md:p-6 relative ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`}>
              <button onClick={() => setShowApplyForm(false)} className={`absolute top-3 right-3 ${isDarkMode ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                <FaTimes size={18} />
              </button>

              <div className={`flex flex-col items-center mb-4 border-b pb-4 ${isDarkMode ? 'border-zinc-800' : 'border-border'}`}>
                <img src={user?.photoURL || '/images/placeholder.png'} alt="Profile" className="w-14 h-14 rounded-full border-4 border-primary/20 mb-2 shadow-md object-cover" />
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Complete Application</h2>
                <div className={`text-xs font-medium px-3 py-1 rounded-full mt-2 border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {user?.email}
                </div>
              </div>

              <form onSubmit={submitApplication} className="space-y-3">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>Bank Name</label>
                  <input required value={bankName} onChange={e => setBankName(e.target.value)} type="text" placeholder="e.g. Zenith Bank" className={`w-full p-2.5 text-sm rounded-lg border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>Account Number</label>
                  <input required value={accountNumber} onChange={e => { const val = e.target.value.replace(/\D/g, ''); if (val.length <= 10) setAccountNumber(val); }} type="text" placeholder="10-digit number" className={`w-full p-2.5 text-sm rounded-lg border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>Account Name</label>
                  <input required value={accountName} onChange={e => setAccountName(e.target.value)} type="text" placeholder="Exact name on account" className={`w-full p-2.5 text-sm rounded-lg border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                  <p className="text-[10px] font-bold text-primary mt-1.5 flex items-center gap-1">
                    <FaUserCircle /> Note: Your account name will be used as your Partnership Username.
                  </p>
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>Phone Number</label>
                  <input required value={phoneNumber} onChange={e => { const val = e.target.value.replace(/\D/g, ''); if (val.length <= 11) setPhoneNumber(val); }} type="text" placeholder="e.g. 08012345678" className={`w-full p-2.5 text-sm rounded-lg border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                  <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Must be exactly 11 digits</p>
                </div>
                <button disabled={applying} type="submit" className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg disabled:opacity-50 mt-4 ${isDarkMode ? 'bg-white text-black hover:bg-zinc-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- PENDING STATUS VIEW ---
  if (partnerData.status === 'pending') {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'bg-zinc-950' : 'bg-slate-50'}`}>
        <ThemeToggle />
        <div className={`p-8 md:p-12 rounded-3xl shadow-xl text-center max-w-md animate-in zoom-in-95 duration-500 ${isDarkMode ? 'bg-zinc-900 border border-zinc-800 shadow-black/50' : 'bg-white border border-border'}`}>
          <div className="w-20 h-20 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <FaHandshake size={32} className="animate-pulse" />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Application Submitted!</h2>
          <p className={`mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
            Congratulations! Your partnership application was successful and is currently awaiting admin approval.
          </p>
          <div className={`p-4 rounded-xl text-sm font-semibold border ${isDarkMode ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            Please check back later to see if your request has been approved.
          </div>
        </div>
      </div>
    );
  }

  // --- REJECTED STATUS VIEW ---
  if (partnerData.status === 'rejected') {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'bg-zinc-950' : 'bg-slate-50'}`}>
        <ThemeToggle />
        <div className={`p-8 md:p-12 rounded-3xl shadow-xl text-center max-w-md ${isDarkMode ? 'bg-zinc-900 border border-zinc-800 shadow-black/50' : 'bg-white border border-border'}`}>
          <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <FaTimes size={32} />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Application Declined</h2>
          <p className={`mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
            Unfortunately, your partnership application could not be approved at this time. Please try again later.
          </p>
          <div className={`p-4 rounded-xl text-sm font-semibold border mb-6 ${isDarkMode ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            You can reapply by submitting a new application below.
          </div>
          <button
            onClick={async () => {
              try {
                await deleteDoc(doc(db, 'partners', user.uid));
                setWasRejected(true);
                setPartnerData(null);
                toast.success('You can now submit a new application.');
              } catch (error) {
                toast.error('Something went wrong. Please try again.');
              }
            }}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-zinc-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            Reapply for Partnership
          </button>
        </div>
      </div>
    );
  }

  // --- APPROVED DASHBOARD VIEW ---
  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${isDarkMode ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

      <ThemeToggle />

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 px-4 animate-in fade-in">
          <div className={`border rounded-3xl shadow-2xl w-full max-w-md p-8 text-center relative overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-border'}`}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary" />
            <h2 className={`text-3xl font-black mb-4 mt-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Welcome Aboard! 🎉</h2>
            <p className={`mb-8 leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
              Your partnership account is now active! You can start sharing your referral link immediately. Every new customer that buys through your link earns you a profit cut.
            </p>
            <button onClick={() => setShowWelcome(false)} className={`w-full py-4 rounded-xl font-bold shadow-lg transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-zinc-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              Let's get started
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`${isDarkMode ? 'bg-black' : 'bg-slate-900'} text-white pt-12 pb-24 md:pt-16 px-4 relative overflow-hidden`}>
        <div className="max-w-[1200px] mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <img src={partnerData.photoURL || '/images/placeholder.png'} alt="Profile" className="w-16 h-16 rounded-full border-2 border-primary object-cover" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Partner Dashboard</h1>
              <p className={`text-sm md:text-base ${isDarkMode ? 'text-zinc-400' : 'text-slate-400'}`}>Welcome back, <span className="text-white font-semibold">{partnerData.accountName}</span></p>
            </div>
          </div>
          <button onClick={handleDeleteAccount} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 font-bold bg-white/5 px-4 py-2 rounded-lg transition-colors border border-red-500/20">
            <FaTrash /> Delete Account
          </button>
        </div>
      </div>

      {/* Edit Bank Info Modal */}
      {showEditBank && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 px-2 backdrop-blur-sm animate-in fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-sm p-3 md:p-4 relative ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`}>
            <button onClick={() => setShowEditBank(false)} className={`absolute top-3 right-3 ${isDarkMode ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
              <FaTimes size={18} />
            </button>
            <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <FaEdit className="text-primary" /> Edit Details
            </h2>
            <div className="space-y-3">
              <div>
                <label className={`text-xs font-bold block mb-1 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>Bank Name</label>
                <input value={editBankName} onChange={e => setEditBankName(e.target.value)} type="text" placeholder="e.g. Zenith Bank" className={`w-full p-2.5 text-sm rounded-lg border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className={`text-xs font-bold block mb-1 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>Account Number</label>
                <input value={editAccountNumber} onChange={e => { const val = e.target.value.replace(/\D/g, ''); if (val.length <= 10) setEditAccountNumber(val); }} type="text" placeholder="10-digit number" className={`w-full p-2.5 text-sm rounded-lg border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className={`text-xs font-bold block mb-1 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>Phone Number</label>
                <input value={editPhoneNumber} onChange={e => { const val = e.target.value.replace(/\D/g, ''); if (val.length <= 11) setEditPhoneNumber(val); }} type="text" placeholder="e.g. 08012345678" className={`w-full p-2.5 text-sm rounded-lg border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Must be exactly 11 digits</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowEditBank(false)} className={`flex-1 py-2.5 rounded-xl font-bold text-sm border ${isDarkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>Cancel</button>
                <button onClick={handleEditBankInfo} disabled={editSaving} className={`flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 ${isDarkMode ? 'bg-white text-black hover:bg-zinc-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 -mt-12 relative z-20 space-y-8">

        {/* Referral Info & Motivation */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className={`md:col-span-2 p-6 md:p-8 rounded-2xl shadow-lg border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Your Referral Details</h3>
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
              <div className={`flex-1 p-4 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-primary uppercase mb-1">Referral Code</p>
                  <p className={`font-mono font-bold text-lg ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>{partnerData.referralCode}</p>
                </div>
              </div>
              <div className={`flex-1 p-4 rounded-xl border flex flex-col justify-center ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className="text-[10px] font-bold text-primary uppercase mb-1">Referral Link</p>
                <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>{partnerData.referralLink}</p>
              </div>
              <button onClick={handleShare} className="bg-primary text-white font-bold px-6 py-4 rounded-xl shadow-md hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shrink-0">
                <FaShare /> Share Link
              </button>
            </div>
          </div>

          <div className={`p-6 md:p-8 rounded-2xl shadow-lg text-white flex flex-col justify-center border ${isDarkMode ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-800' : 'bg-gradient-to-br from-primary to-secondary border-transparent'}`}>
            <h3 className="text-xl font-bold mb-2">Keep Grinding! 🚀</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              "Success is the sum of small efforts, repeated day in and day out." Share your link and watch your earnings grow!
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
            <p className={`text-sm font-bold uppercase mb-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Products Sold</p>
            <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{stats.totalItems}</p>
          </div>
          <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
            <p className={`text-sm font-bold uppercase mb-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Total Company Profit</p>
            <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>₦{stats.companyProfit.toLocaleString()}</p>
          </div>
          <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center relative overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 ${isDarkMode ? 'bg-primary/20' : 'bg-green-500/10'}`} />
            <p className={`text-sm font-bold uppercase mb-2 relative z-10 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Your Total Earnings</p>
            <p className={`text-4xl font-black relative z-10 ${isDarkMode ? 'text-primary' : 'text-green-600'}`}>₦{stats.partnerProfit.toLocaleString()}</p>
          </div>
        </div>

        {/* Bank Info & Contact CEO */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl shadow-sm border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Your Bank Details</h3>
              <button
                onClick={() => { setEditBankName(partnerData.bankName || ''); setEditAccountNumber(partnerData.accountNumber || ''); setEditPhoneNumber(partnerData.phoneNumber || ''); setShowEditBank(true); }}
                className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-zinc-800 text-primary hover:bg-zinc-700 border border-zinc-700' : 'bg-slate-100 text-primary hover:bg-slate-200 border border-slate-200'}`}
              >
                <FaEdit size={12} /> Edit
              </button>
            </div>
            <div className="space-y-2">
              <div className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Bank: <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{partnerData.bankName}</span></div>
              <div className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Account: <span className={`font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{partnerData.accountNumber}</span></div>
              <div className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Name: <span className={`font-bold capitalize ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{partnerData.accountName}</span></div>
              {partnerData.phoneNumber && (
                <div className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Phone: <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{partnerData.phoneNumber}</span></div>
              )}
            </div>
          </div>

          {ceoPhone && (
            <a
              href={`https://wa.me/${ceoPhone.replace(/^0/, '234').replace(/^\+/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center gap-3 transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:border-green-800' : 'bg-white border-slate-100 hover:border-green-300'}`}
            >
              <div className="w-14 h-14 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                <FaWhatsapp size={28} />
              </div>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Contact CEO</h3>
              <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Have questions or need support? Chat directly with the CEO via WhatsApp.</p>
            </a>
          )}
        </div>

        {/* Table */}
        <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
          <div className={`p-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Sales History</h3>
          </div>
          {purchasedItems.length === 0 ? (
            <div className={`p-12 text-center ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
              No sales yet. Share your link to start earning!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className={`text-xs uppercase font-bold border-b ${isDarkMode ? 'bg-zinc-950 text-zinc-500 border-zinc-800' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Company Profit</th>
                    <th className="px-6 py-4 text-right">Your Cut</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                  {purchasedItems.map((item, idx) => (
                    <tr key={idx} className={`transition-colors ${isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={item.image || '/images/placeholder.png'} alt={item.name} className={`w-10 h-10 rounded-md object-cover border ${isDarkMode ? 'border-zinc-700' : 'border-slate-200'}`} />
                          <div className={`font-semibold max-w-[200px] truncate ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`} title={item.name}>{item.name}</div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>₦{(item.price || 0).toLocaleString()}</td>
                      <td className={`px-6 py-4 font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>₦{(item.profit || 0).toLocaleString()}</td>
                      <td className={`px-6 py-4 text-right font-black ${isDarkMode ? 'text-primary' : 'text-green-600'}`}>₦{(item.partnerCut || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
