'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaUserPlus, FaTrash, FaSearch, FaLink, FaUserTie, FaSave, FaLock, FaUserShield } from 'react-icons/fa';
import Image from 'next/image';

const DEFAULT_INTERNAL_ROUTES = [
  '/ADMIN/PRODUCTS',
  '/ADMIN/INSTALLMENTS',
  '/ADMIN/SETTINGS',
  '/ADMIN/STATS',
  '/ADMIN/ABOUT'
];

export default function AdminManagement() {
  // CEO Profile State
  const [ceoInfo, setCeoInfo] = useState({
    name: '',
    phone: '',
    email: '',
    image: '',
    message: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Admin Management State
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [routeError, setRouteError] = useState(false);
  const [oldPasskeyError, setOldPasskeyError] = useState(false);
  const [securityStats, setSecurityStats] = useState({ attempts: 0, lockoutUntil: 0 });

  // URL Manager State
  const [urlLink, setUrlLink] = useState('');
  const [savedUrls, setSavedUrls] = useState<string[]>([]);

  // Passkey State
  const [oldPasskey, setOldPasskey] = useState('');
  const [newPasskey, setNewPasskey] = useState('');

  // Remove Admin Confirmation Overlay
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingRemoveEmail, setPendingRemoveEmail] = useState<string>('');
  const [removePasskeyInput, setRemovePasskeyInput] = useState('');
  const [removePasskeyError, setRemovePasskeyError] = useState('');
  const [removeLoading, setRemoveLoading] = useState(false);
  const [showDuplicateAdminOverlay, setShowDuplicateAdminOverlay] = useState(false);

  useEffect(() => {
    // Fetch current admins
    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snap) => {
      setAdmins(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch site settings (including CEO info and URLs)
    const fetchSettings = async () => {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.ceoInfo) setCeoInfo(data.ceoInfo);

        // Ensure defaults are present and all are uppercase
        const existingUrls = (data.savedUrls || []).map((u: string) => u.toUpperCase());
        const merged = Array.from(new Set([...DEFAULT_INTERNAL_ROUTES, ...existingUrls]));
        setSavedUrls(merged);

        setSecurityStats({
          attempts: data.passkeyAttempts || 0,
          lockoutUntil: data.lockoutUntil || 0
        });
      }
    };
    fetchSettings();

    return () => unsubAdmins();
  }, []);

  // Real-time Search Logic
  useEffect(() => {
    const cleanSearch = searchEmail.trim().toLowerCase();
    if (cleanSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const q = query(
      collection(db, 'users'),
      where('email', '>=', cleanSearch),
      where('email', '<=', cleanSearch + '\uf8ff')
    );

    const unsubSearch = onSnapshot(q, (snap) => {
      const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSearchResults(users);
    });

    return () => unsubSearch();
  }, [searchEmail]);

  const selectUser = (user: any) => {
    setFoundUser(user);
    setSearchEmail(user.email);
    setSearchResults([]);
  };

  const handleAddAdmin = async () => {
    if (!foundUser) return;
    if (selectedRoutes.length === 0) {
      setRouteError(true);
      toast.error('Incomplete Setup: You cannot add an admin staff without assigning at least one route link. Please select the routes this staff should operate on.');
      return;
    }

    if (admins.some(a => a.id === foundUser.id)) {
      setShowDuplicateAdminOverlay(true);
      return;
    }

    try {
      await setDoc(doc(db, 'admins', foundUser.id), {
        uid: foundUser.id,
        email: foundUser.email,
        role: 'Admin',
        assignedRoutes: selectedRoutes,
      });
      toast.success('Admin staff added successfully!');
      setFoundUser(null);
      setSelectedRoutes([]);
      setSearchEmail('');
    } catch (error) {
      toast.error('Failed to add admin.');
    }
  };

  const openRemoveOverlay = (uid: string, email: string) => {
    setPendingRemoveId(uid);
    setPendingRemoveEmail(email);
    setRemovePasskeyInput('');
    setRemovePasskeyError('');
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemoveId) return;
    setRemoveLoading(true);
    setRemovePasskeyError('');
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const currentPasskey = settingsDoc.data()?.passkey || 'admin1234';
      if (removePasskeyInput !== currentPasskey) {
        setRemovePasskeyError('Incorrect passkey. Please try again.');
        setRemoveLoading(false);
        return;
      }
      await deleteDoc(doc(db, 'admins', pendingRemoveId));
      toast.success('Admin staff removed.');
      setPendingRemoveId(null);
      setRemovePasskeyInput('');
    } catch (error) {
      toast.error('Failed to remove admin.');
    }
    setRemoveLoading(false);
  };

  const cancelRemove = () => {
    setPendingRemoveId(null);
    setRemovePasskeyInput('');
    setRemovePasskeyError('');
  };

  const handleAddUrl = async () => {
    if (!urlLink) return;

    // Clean input: remove leading/trailing slashes and the 'admin/' prefix if already typed
    let cleanInput = urlLink.trim().toUpperCase()
      .replace(/^\/+/, '')           // Remove leading slashes
      .replace(/^ADMIN\//i, '')      // Remove 'ADMIN/' if typed
      .replace(/^\/+/, '');          // Remove any slashes that were after 'ADMIN/'

    if (!cleanInput) return;

    const formattedUrl = `/ADMIN/${cleanInput}`;

    if (savedUrls.includes(formattedUrl)) {
      toast.error('This route already exists.');
      return;
    }

    const newUrls = [...savedUrls, formattedUrl];
    try {
      await setDoc(doc(db, 'settings', 'general'), { savedUrls: newUrls }, { merge: true });
      setSavedUrls(newUrls);
      setUrlLink('');
      toast.success('Route link saved and synced to cloud!');
    } catch (error) {
      toast.error('Failed to save route to database.');
    }
  };

  const handleDeleteUrl = async (urlToDelete: string) => {
    const isDefault = DEFAULT_INTERNAL_ROUTES.includes(urlToDelete);
    if (isDefault && !confirm(`Warning: "${urlToDelete}" is a core system route. Removing it from this list will prevent you from assigning it to staff. Are you sure?`)) {
      return;
    }

    const newUrls = savedUrls.filter(u => u !== urlToDelete);
    try {
      await setDoc(doc(db, 'settings', 'general'), { savedUrls: newUrls }, { merge: true });
      setSavedUrls(newUrls);
      toast.success('Route removed from database.');
    } catch (error) {
      toast.error('Failed to sync removal to database.');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveCeoProfile = async () => {
    try {
      let imageUrl = ceoInfo.image;

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        );
        const data = await res.json();
        imageUrl = data.secure_url;
      }

      await setDoc(doc(db, 'settings', 'general'), {
        ceoInfo: { ...ceoInfo, image: imageUrl }
      }, { merge: true });

      toast.success('CEO Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile.');
    }
  };

  const handleChangePasskey = async () => {
    if (!oldPasskey) {
      toast.error('Missing Information: Please enter your current old passkey.');
      return;
    }
    if (!newPasskey) {
      toast.error('Missing Information: Please enter a new passkey to update.');
      return;
    }

    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const data = settingsDoc.data();
      const currentPasskey = data?.passkey || 'admin1234';
      const attempts = data?.passkeyAttempts || 0;
      const lockout = data?.lockoutUntil || 0;

      if (lockout > Date.now()) {
        const remainingMs = lockout - Date.now();
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        toast.error(`Security Lockout: Too many failed attempts. Try again in ${hours}h ${minutes}m.`);
        return;
      }

      // Validation: at least 8 chars, letters and numbers
      const passkeyRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passkeyRegex.test(newPasskey)) {
        toast.error('Passkey must be at least 8 characters long and contain both letters and numbers.');
        return;
      }

      if (oldPasskey !== currentPasskey) {
        const newAttempts = attempts + 1;
        let updateData: any = { passkeyAttempts: newAttempts };

        if (newAttempts >= 10) {
          const lockUntil = Date.now() + 24 * 60 * 60 * 1000;
          updateData.lockoutUntil = lockUntil;
          setSecurityStats({ attempts: newAttempts, lockoutUntil: lockUntil });
          toast.error('Maximum attempts reached. Access locked for 24 hours.');
        } else {
          setSecurityStats(prev => ({ ...prev, attempts: newAttempts }));
          toast.error(`Incorrect passkey. ${10 - newAttempts} attempts remaining.`);
        }

        await setDoc(doc(db, 'settings', 'general'), updateData, { merge: true });
        setOldPasskeyError(true);
        return;
      }

      await setDoc(doc(db, 'settings', 'general'), {
        passkey: newPasskey,
        passkeyAttempts: 0,
        lockoutUntil: 0
      }, { merge: true });

      setSecurityStats({ attempts: 0, lockoutUntil: 0 });
      toast.success('Passkey updated successfully!');
      setOldPasskey('');
      setNewPasskey('');
      setOldPasskeyError(false);
    } catch (error) {
      toast.error('Failed to update passkey.');
    }
  };

  return (
    <AdminGuard requireCEO={true}>
      {/* ── REMOVE ADMIN PASSKEY OVERLAY ── */}
      {pendingRemoveId && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 px-4">
          <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-sm p-6 animate-[slideIn_0.2s_ease]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🔐</span>
              <div>
                <h3 className="font-bold text-base">Confirm Removal</h3>
                <p className="text-[0.72rem] text-muted-foreground">You are about to remove:</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-secondary mb-4 bg-secondary/10 px-3 py-2 rounded-md break-all">{pendingRemoveEmail}</p>
            <label className="block text-xs font-bold mb-1 text-muted-foreground">Enter CEO Passkey to confirm</label>
            <input
              type="password"
              autoFocus
              placeholder="CEO Passkey"
              className={`w-full p-3 rounded-md border bg-background text-sm mb-1 ${removePasskeyError ? 'border-secondary' : 'border-border'}`}
              value={removePasskeyInput}
              onChange={(e) => { setRemovePasskeyInput(e.target.value); setRemovePasskeyError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmRemove()}
            />
            {removePasskeyError && <p className="text-secondary text-[0.7rem] mb-3">{removePasskeyError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={cancelRemove}
                className="flex-1 py-2.5 rounded-md border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={removeLoading || !removePasskeyInput}
                className="flex-1 py-2.5 rounded-md bg-secondary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {removeLoading ? 'Removing…' : 'Remove Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DUPLICATE ADMIN OVERLAY ── */}
      {showDuplicateAdminOverlay && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 px-4">
          <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-sm p-8 text-center animate-[slideIn_0.2s_ease]">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-bold text-xl mb-2">Staff Already Exists</h3>
            <p className="text-sm text-muted-foreground mb-6">
              The user <span className="text-primary font-bold">{foundUser?.email}</span> is already an admin staff member. You cannot add them twice.
            </p>
            <button
              onClick={() => { setShowDuplicateAdminOverlay(false); setFoundUser(null); setSearchEmail(''); }}
              className="w-full py-3 rounded-md bg-primary text-white font-bold hover:opacity-90 transition-opacity"
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}
      <div className="max-w-[1000px] mx-auto space-y-8 md:space-y-12 pb-20 px-2 md:px-0">
        <header className="px-4 md:px-0">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <FaUserShield className="text-primary" /> Admin Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">Manage your staff, URLs, and CEO profile.</p>
        </header>

        {/* URL MANAGER SECTION */}
        <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2"><FaLink /> URL Manager</h2>
          <div className="flex flex-col md:flex-row gap-2 mb-6">
            <div className="flex-1 flex items-center bg-background border border-border rounded-md overflow-hidden focus-within:border-primary transition-colors">
              <span className="pl-3 py-3 text-muted-foreground text-sm font-bold bg-muted/30 border-r border-border">/admin/</span>
              <input 
                type="text" 
                placeholder="management" 
                className="flex-1 p-3 bg-transparent text-sm focus:outline-none"
                value={urlLink}
                onChange={(e) => setUrlLink(e.target.value)}
              />
            </div>
            <button onClick={handleAddUrl} className="bg-primary text-white px-6 py-3 rounded-md font-bold text-sm">Save Link</button>
          </div>
          <div className="flex flex-wrap gap-3 max-h-[180px] md:max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {savedUrls.map(url => (
              <div key={url} className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-2 border border-border rounded-md bg-muted/50 text-[0.6rem] md:text-[0.7rem] font-bold shadow-sm animate-in fade-in zoom-in duration-300">
                <span className="tracking-tight text-primary/80">🔗 {url.replace(/^\/ADMIN\//, '')}</span>
                <button
                  onClick={() => handleDeleteUrl(url)}
                  className="ml-2 p-1.5 rounded-full hover:bg-red-50 text-secondary transition-all hover:text-red-700"
                  title="Remove this route"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ADMIN STAFF SECTION */}
        <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2"><FaUserPlus /> Manage Admin Staff</h2>

          <div className="flex flex-col gap-4 mb-8">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Type name or email to search..."
                className="w-full p-3 pl-10 rounded-md border border-border bg-background text-sm"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-4 text-muted-foreground" />

              {/* DYNAMIC RESULTS DROPDOWN */}
              {searchEmail.trim().length >= 2 && searchResults.length === 0 && (
                <div className="absolute top-full left-0 w-full bg-card border border-border rounded-md shadow-xl mt-1 z-50 p-4 text-center text-xs text-muted-foreground">
                  No users found starting with "{searchEmail}"
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-card border border-border rounded-md shadow-xl mt-1 z-50 overflow-hidden">
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => selectUser(u)}
                      className="w-full p-3 text-left hover:bg-muted border-b border-border last:border-0 flex flex-col"
                    >
                      <span className="font-bold text-sm">{u.displayName || 'Unnamed'}</span>
                      <span className="text-[10px] text-muted-foreground">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-6 italic">* Note: Searching for users registered via Google.</p>

          {foundUser && (
            <div className="p-4 md:p-6 bg-muted rounded-md mb-8 border border-primary/20">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-base md:text-lg">{foundUser.displayName || 'Unnamed User'}</h3>
                  <p className="text-muted-foreground text-xs md:text-sm">{foundUser.email}</p>
                </div>
                <button onClick={handleAddAdmin} className="w-full md:w-auto bg-primary text-white px-6 py-2 rounded-md font-bold text-sm">Add as Admin</button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold">Assign Routes:</p>
                <div className="flex flex-wrap gap-3">
                  {savedUrls.map(route => (
                    <label key={route} className="flex items-center gap-1.5 px-2 py-1.5 md:px-3 md:py-2 border border-border rounded-md hover:bg-primary/5 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRoutes.includes(route)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoutes([...selectedRoutes, route]);
                            setRouteError(false);
                          }
                          else setSelectedRoutes(selectedRoutes.filter(r => r !== route));
                        }}
                        className="accent-primary w-3 h-3 md:w-4 md:h-4"
                      />
                      <span className="text-[0.65rem] md:text-xs font-bold uppercase tracking-tight">{route.replace(/^\/ADMIN\//, '')}</span>
                    </label>
                  ))}
                </div>
                {routeError && (
                  <p className="text-secondary text-[0.7rem] mt-2 font-bold flex items-center gap-1 animate-pulse">
                    ⚠️ Error: At least one route must be assigned to create this admin staff.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-bold text-[0.7rem] text-muted-foreground uppercase tracking-wider">Current Admin Staff</h3>
            {admins.filter(a => a.role !== 'CEO').map(admin => (
              <div key={admin.id} className="flex justify-between items-center p-2 md:p-4 border border-border rounded-md hover:bg-muted/50 transition-colors">
                <div className="min-w-0 pr-2 md:pr-4">
                  <p className="font-bold text-sm truncate">{admin.email}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {admin.assignedRoutes?.map((route: string) => (
                      <span key={route} className="text-[#065f46] font-semibold text-[0.65rem] md:text-[0.7rem] bg-green-50 px-2 py-0.5 rounded-md border border-green-200 uppercase tracking-wider">
                        {route.replace(/^\/ADMIN\//, '')}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => openRemoveOverlay(admin.id, admin.email)}
                  className="text-secondary p-2 hover:bg-secondary/10 rounded-full shrink-0"
                  title="Remove admin"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* CEO CONTACT SECTION */}
        <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2"><FaUserTie /> CEO Contact Section</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs md:text-sm font-bold mb-2">Full Name</label>
              <input
                type="text"
                className="w-full p-3 rounded-md border border-border bg-background text-sm"
                value={ceoInfo.name}
                onChange={(e) => setCeoInfo({ ...ceoInfo, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold mb-2">Phone Number</label>
              <input
                type="text"
                className="w-full p-3 rounded-md border border-border bg-background text-sm"
                value={ceoInfo.phone}
                onChange={(e) => setCeoInfo({ ...ceoInfo, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold mb-2">Email Address</label>
              <input
                type="email"
                className="w-full p-3 rounded-md border border-border bg-background text-sm"
                value={ceoInfo.email}
                onChange={(e) => setCeoInfo({ ...ceoInfo, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold mb-2">Image URL (Optional)</label>
              <input
                type="text"
                className="w-full p-3 rounded-md border border-border bg-background text-sm"
                placeholder="https://..."
                value={ceoInfo.image}
                onChange={(e) => setCeoInfo({ ...ceoInfo, image: e.target.value })}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs md:text-sm font-bold mb-2">Or Upload Image</label>
            <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs w-full" />
            {imagePreview && (
              <div className="mt-4 relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-primary">
                <Image src={imagePreview} alt="CEO Preview" fill className="object-cover" />
              </div>
            )}
          </div>

          <div className="mb-8">
            <label className="block text-xs md:text-sm font-bold mb-2">CEO Message (For About Page)</label>
            <textarea
              rows={4}
              className="w-full p-3 rounded-md border border-border bg-background text-sm"
              value={ceoInfo.message}
              onChange={(e) => setCeoInfo({ ...ceoInfo, message: e.target.value })}
            />
          </div>

          <button onClick={handleSaveCeoProfile} className="w-full bg-primary text-white py-4 rounded-md font-bold flex items-center justify-center gap-2 text-sm">
            <FaSave /> Save CEO Profile
          </button>
        </section>

        {/* PASSKEY SECTION */}
        <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm border-secondary/30">
          <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2"><FaLock className="text-secondary" /> Change CEO Passkey</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs md:text-sm font-bold mb-2">Old Passkey</label>
              <input
                type="password"
                className={`w-full p-3 rounded-md border bg-background text-sm ${oldPasskeyError ? 'border-secondary' : 'border-border'}`}
                value={oldPasskey}
                onChange={(e) => {
                  setOldPasskey(e.target.value);
                  setOldPasskeyError(false);
                }}
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold mb-2">New Passkey</label>
              <input
                type="password"
                placeholder="8+ chars (A-z, 0-9)"
                className="w-full p-3 rounded-md border border-border bg-background text-sm"
                value={newPasskey}
                onChange={(e) => setNewPasskey(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <button
              onClick={handleChangePasskey}
              disabled={securityStats.lockoutUntil > Date.now()}
              className="w-full md:w-auto bg-secondary text-white px-8 py-3 rounded-md font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {securityStats.lockoutUntil > Date.now() ? 'Locked Out' : 'Update Passcode'}
            </button>

            {securityStats.attempts > 0 && securityStats.lockoutUntil <= Date.now() && (
              <span className="text-[0.7rem] text-muted-foreground font-medium">
                {10 - securityStats.attempts} attempts remaining before 24h lockout.
              </span>
            )}
          </div>

          {oldPasskeyError && securityStats.lockoutUntil <= Date.now() && (
            <p className="text-secondary text-[0.7rem] mt-3 font-bold flex items-center gap-1 animate-pulse">
              ⚠️ Error: The old passkey is incorrect. {10 - securityStats.attempts} tries left.
            </p>
          )}

          {securityStats.lockoutUntil > Date.now() && (
            <p className="text-secondary text-[0.7rem] mt-3 font-bold flex items-center gap-1">
              🔐 Security Lock: Too many failed attempts. Try again in {Math.ceil((securityStats.lockoutUntil - Date.now()) / (1000 * 60 * 60))} hours.
            </p>
          )}
        </section>
      </div>
    </AdminGuard>
  );
}
