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
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaUserPlus, FaTrash, FaSearch, FaLink, FaUserTie, FaSave, FaLock, FaUserShield, FaEdit, FaTimes, FaStore, FaExchangeAlt, FaCrown, FaChevronDown, FaInfoCircle, FaStar, FaWrench } from 'react-icons/fa';
import Image from 'next/image';
import { uploadImageToCloudinary } from '@/actions/upload';
import SpecialStoreEditOverlay from '@/components/SpecialStoreEditOverlay';
import { useStarThresholds } from '@/hooks/useStarThresholds';
import { useShippingMaxDays } from '@/hooks/useShippingMaxDays';
import { useNewTagDurationDays } from '@/hooks/useNewTagDurationDays';
import { getAdminRoutes } from '@/actions/getAdminRoutes';

const DEFAULT_INTERNAL_ROUTES = [
  '/ADMIN/MANAGEMENT',
  '/ADMIN/PRODUCTS',
  '/ADMIN/FOODS',
  '/ADMIN/COSMETICS',
  '/ADMIN/WEARS',
  '/ADMIN/TOILET-KITCHEN',
  '/ADMIN/UK-USED',
  '/ADMIN/INSTALLMENTS',
  '/ADMIN/COMPLAINTS',
  '/ADMIN/ORDERS',
  '/ADMIN/PARTNERSHIP',
  '/ADMIN/BROADCAST',
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
  
  // Maintenance State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

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
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Vendor Transfer State
  const [oldVendorEmail, setOldVendorEmail] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Vendor Search State (for transfer inputs)
  const [oldVendorSearch, setOldVendorSearch] = useState('');
  const [newVendorSearch, setNewVendorSearch] = useState('');
  const [oldVendorResults, setOldVendorResults] = useState<any[]>([]);
  const [newVendorResults, setNewVendorResults] = useState<any[]>([]);
  const [oldVendorShowCount, setOldVendorShowCount] = useState(20);
  const [newVendorShowCount, setNewVendorShowCount] = useState(20);
  const [oldVendorFocused, setOldVendorFocused] = useState(false);
  const [newVendorFocused, setNewVendorFocused] = useState(false);

  // Vendor Delete State
  const [pendingVendorDeleteId, setPendingVendorDeleteId] = useState<string | null>(null);
  const [pendingVendorDeleteEmail, setPendingVendorDeleteEmail] = useState('');
  const [vendorDeletePasskey, setVendorDeletePasskey] = useState('');
  const [vendorDeleteError, setVendorDeleteError] = useState('');
  const [vendorDeleteLoading, setVendorDeleteLoading] = useState(false);

  // Special Store State
  const [editStoreAdminId, setEditStoreAdminId] = useState<string | null>(null);
  const [editStoreAdminEmail, setEditStoreAdminEmail] = useState('');

  // Star Threshold State, Shipping Max Days & New Tag Duration State
  const liveThresholds = useStarThresholds();
  const liveShippingMaxDays = useShippingMaxDays();
  const liveNewTagDurationDays = useNewTagDurationDays();
  const [editableThresholds, setEditableThresholds] = useState<{[star: number]: number}>({ 1: 20, 2: 50, 3: 100, 4: 250, 5: 500 });
  const [shippingMaxDaysInput, setShippingMaxDaysInput] = useState<number>(3);
  const [newTagDurationDaysInput, setNewTagDurationDaysInput] = useState<number>(5);
  const [specialStoreMessageDurationDaysInput, setSpecialStoreMessageDurationDaysInput] = useState<number>(30);
  const [showThresholdConfirm, setShowThresholdConfirm] = useState(false);
  const [thresholdSaveLoading, setThresholdSaveLoading] = useState(false);

  // Sync editable thresholds when live values load
  useEffect(() => {
    if (liveThresholds) {
      setEditableThresholds(liveThresholds as {[star: number]: number});
    }
  }, [liveThresholds]);

  useEffect(() => {
    if (liveShippingMaxDays !== undefined) {
      setShippingMaxDaysInput(liveShippingMaxDays);
    }
  }, [liveShippingMaxDays]);

  useEffect(() => {
    if (liveNewTagDurationDays !== undefined) {
      setNewTagDurationDaysInput(liveNewTagDurationDays);
    }
  }, [liveNewTagDurationDays]);

  useEffect(() => {
    const settingsDoc = doc(db, 'settings', 'general');
    const unsub = onSnapshot(settingsDoc, (snap) => {
      const data = snap.data();
      if (data?.specialStoreMessageDurationDays !== undefined && data?.specialStoreMessageDurationDays !== null) {
        setSpecialStoreMessageDurationDaysInput(Number(data.specialStoreMessageDurationDays) || 30);
      }
      if (data?.maintenanceMode !== undefined) {
        setMaintenanceMode(!!data.maintenanceMode);
      }
    }, (error) => {
      console.warn('Special store chat duration listener error:', error);
    });

    return () => unsub();
  }, []);

  // Save settings handler
  const handleSaveThresholds = async () => {
    setThresholdSaveLoading(true);
    try {
      await updateDoc(doc(db, 'settings', 'general'), { 
        starThresholds: editableThresholds,
        shippingMaxDays: Number(shippingMaxDaysInput) || 3,
        newTagDurationDays: Number(newTagDurationDaysInput) || 5,
        specialStoreMessageDurationDays: Number(specialStoreMessageDurationDaysInput) || 30
      });
      toast.success('Settings updated successfully!');
      setShowThresholdConfirm(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setThresholdSaveLoading(false);
    }
  };

  useEffect(() => {
    // Fetch current admins
    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snap) => {
      setAdmins(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Management admins listener error:", error);
    });

    // Fetch site settings (including CEO info and URLs)
    const fetchSettings = async () => {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.ceoInfo) setCeoInfo(data.ceoInfo);

        // Fetch dynamic routes from file system
        const autoRoutes = await getAdminRoutes();
        const defaultRoutes = autoRoutes.length > 0 ? autoRoutes : DEFAULT_INTERNAL_ROUTES;

        // Ensure defaults are present and all are uppercase
        const existingUrls = (data.savedUrls || []).map((u: string) => u.toUpperCase());
        const merged = Array.from(new Set([...defaultRoutes, ...existingUrls]));
        setSavedUrls(merged);

        setSecurityStats({
          attempts: data.passkeyAttempts || 0,
          lockoutUntil: data.lockoutUntil || 0
        });
      }
    };
    fetchSettings();

    return () => {
      unsubAdmins();
    };
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
    }, (error) => {
      console.warn("Management search listener error:", error);
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

  const handleUpdateAdmin = async () => {
    if (!editingAdmin) return;
    setEditLoading(true);
    try {
      await updateDoc(doc(db, 'admins', editingAdmin.id), {
        assignedRoutes: editingAdmin.assignedRoutes
      });
      toast.success('Admin staff routes updated!');
      setEditingAdmin(null);
    } catch (error) {
      toast.error('Failed to update admin staff.');
    }
    setEditLoading(false);
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

  const handleTransferVendor = async () => {
    if (!oldVendorEmail || !newVendorEmail) {
      toast.error('Please enter both old and new vendor emails.');
      return;
    }

    setTransferLoading(true);
    try {
      const collectionsToUpdate = ['foods', 'products', 'cosmetics', 'wears', 'toilet_kitchen'];
      let totalUpdated = 0;

      for (const colName of collectionsToUpdate) {
        const q = query(collection(db, colName), where('vendor', '==', oldVendorEmail));
        const snap = await getDocs(q);

        for (const documentSnap of snap.docs) {
          await updateDoc(doc(db, colName, documentSnap.id), { vendor: newVendorEmail });
          totalUpdated++;
        }
      }

      // Transfer Special Store branding if exists
      const oldAdmin = admins.find(a => a.email === oldVendorEmail);
      const newAdmin = admins.find(a => a.email === newVendorEmail);

      let storeTransferred = false;
      if (oldAdmin?.specialStore && newAdmin) {
        const updatedSpecialStore = {
          ...oldAdmin.specialStore,
          ownerEmail: newAdmin.email,
          ownerUid: newAdmin.uid
        };

        // We use setDoc with merge to ensure it works even if admin document doesn't fully exist (though it should)
        await setDoc(doc(db, 'admins', newAdmin.id), { specialStore: updatedSpecialStore }, { merge: true });
        
        // Remove from old admin, we use updateDoc or setDoc
        await setDoc(doc(db, 'admins', oldAdmin.id), { specialStore: null }, { merge: true });
        storeTransferred = true;
      }

      if (totalUpdated > 0 || storeTransferred) {
        if (totalUpdated > 0) toast.success(`Transferred ${totalUpdated} products to ${newVendorEmail}.`);
        if (storeTransferred) toast.success(`Transferred Special Store '${oldAdmin?.specialStore?.name}' to ${newVendorEmail}.`);
        setOldVendorEmail('');
        setNewVendorEmail('');
        setOldVendorSearch('');
        setNewVendorSearch('');
      } else {
        toast.error(`No products or Special Store found for vendor ${oldVendorEmail}.`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to transfer products.');
    }
    setTransferLoading(false);
  };

  // VIP Toggle
  const handleToggleVip = async (adminId: string, currentVip: boolean) => {
    try {
      await updateDoc(doc(db, 'admins', adminId), { vip: !currentVip });
      toast.success(!currentVip ? 'VIP access granted!' : 'VIP access removed.');
    } catch (error) {
      toast.error('Failed to update VIP status.');
    }
  };

  // Vendor Delete
  const openVendorDeleteOverlay = (uid: string, email: string) => {
    setPendingVendorDeleteId(uid);
    setPendingVendorDeleteEmail(email);
    setVendorDeletePasskey('');
    setVendorDeleteError('');
  };

  const handleConfirmVendorDelete = async () => {
    if (!pendingVendorDeleteId) return;
    setVendorDeleteLoading(true);
    setVendorDeleteError('');
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const currentPasskey = settingsDoc.data()?.passkey || 'admin1234';
      if (vendorDeletePasskey !== currentPasskey) {
        setVendorDeleteError('Incorrect passkey. Please try again.');
        setVendorDeleteLoading(false);
        return;
      }
      await deleteDoc(doc(db, 'admins', pendingVendorDeleteId));
      toast.success('Vendor removed successfully.');
      setPendingVendorDeleteId(null);
      setVendorDeletePasskey('');
    } catch (error) {
      toast.error('Failed to remove vendor.');
    }
    setVendorDeleteLoading(false);
  };

  // Filter local admins for old vendor search
  useEffect(() => {
    if (oldVendorSearch && !oldVendorEmail) {
      const clean = oldVendorSearch.trim().toLowerCase();
      const filtered = admins.filter(a => a.role !== 'CEO' && a.email.toLowerCase().includes(clean));
      setOldVendorResults(filtered);
      setOldVendorShowCount(20);
    } else {
      setOldVendorResults([]);
    }
  }, [oldVendorSearch, oldVendorEmail, admins]);

  // Filter local admins for new vendor search
  useEffect(() => {
    if (newVendorSearch && !newVendorEmail) {
      const clean = newVendorSearch.trim().toLowerCase();
      const filtered = admins.filter(a => a.role !== 'CEO' && a.email.toLowerCase().includes(clean));
      setNewVendorResults(filtered);
      setNewVendorShowCount(20);
    } else {
      setNewVendorResults([]);
    }
  }, [newVendorSearch, newVendorEmail, admins]);

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
        const data = await uploadImageToCloudinary(formData);
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

  const handleToggleMaintenance = async () => {
    setMaintenanceLoading(true);
    try {
      const newVal = !maintenanceMode;
      await updateDoc(doc(db, 'settings', 'general'), { maintenanceMode: newVal });
      toast.success(newVal ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled');
    } catch (err) {
      toast.error('Failed to toggle maintenance mode');
    }
    setMaintenanceLoading(false);
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

      {/* ── EDIT ADMIN OVERLAY ── */}
      {editingAdmin && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 md:p-8 animate-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <FaEdit className="text-primary" /> Edit Admin Routes
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Updating permissions for <span className="font-bold text-primary">{editingAdmin.email}</span></p>
              </div>
              <button onClick={() => setEditingAdmin(null)} className="text-muted-foreground hover:text-foreground"><FaTimes /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold mb-3 text-muted-foreground uppercase tracking-widest">Assign Duties (Select Links)</label>
                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {savedUrls.map((route) => (
                    <label
                      key={route}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${editingAdmin.assignedRoutes?.includes(route)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-border/80 text-muted-foreground'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={editingAdmin.assignedRoutes?.includes(route)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingAdmin({ ...editingAdmin, assignedRoutes: [...editingAdmin.assignedRoutes, route] });
                          } else {
                            setEditingAdmin({ ...editingAdmin, assignedRoutes: editingAdmin.assignedRoutes.filter((r: string) => r !== route) });
                          }
                        }}
                        className="accent-primary w-4 h-4"
                      />
                      <span className="text-[0.7rem] font-black uppercase tracking-tight">{route.replace(/^\/ADMIN\//, '')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="flex-1 py-4 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAdmin}
                  disabled={editLoading || !editingAdmin.assignedRoutes?.length}
                  className="flex-1 py-4 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {editLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
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


        {/* SYSTEM CONTROLS SECTION */}
        <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm border-secondary/30">
          <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2"><FaWrench className="text-secondary" /> System Controls</h2>
          <div className="flex items-center justify-between bg-muted/50 p-4 border border-border rounded-md">
            <div>
              <h3 className="font-bold text-sm">Maintenance Mode</h3>
              <p className="text-xs text-muted-foreground mt-1">If enabled, the entire site will be inaccessible to users except the CEO.</p>
            </div>
            <button
              onClick={handleToggleMaintenance}
              disabled={maintenanceLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${maintenanceMode ? 'bg-secondary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
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
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingAdmin({ ...admin })}
                    className="text-primary p-2 hover:bg-primary/10 rounded-full"
                    title="Edit admin routes"
                  >
                    <FaEdit size={14} />
                  </button>
                  <button
                    onClick={() => openRemoveOverlay(admin.id, admin.email)}
                    className="text-secondary p-2 hover:bg-secondary/10 rounded-full"
                    title="Remove admin"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* VENDOR DELETE PASSKEY OVERLAY */}
        {pendingVendorDeleteId && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 px-4">
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-sm p-6 animate-[slideIn_0.2s_ease]">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🔐</span>
                <div>
                  <h3 className="font-bold text-base">Confirm Vendor Deletion</h3>
                  <p className="text-[0.72rem] text-muted-foreground">You are about to remove vendor:</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-secondary mb-4 bg-secondary/10 px-3 py-2 rounded-md break-all">{pendingVendorDeleteEmail}</p>
              <p className="text-[0.65rem] text-muted-foreground mb-3 bg-yellow-50 border border-yellow-200 rounded-md p-2">⚠️ This will also remove them from the Admin Staff list.</p>
              <label className="block text-xs font-bold mb-1 text-muted-foreground">Enter CEO Passkey to confirm</label>
              <input
                type="password"
                autoFocus
                placeholder="CEO Passkey"
                className={`w-full p-3 rounded-md border bg-background text-sm mb-1 ${vendorDeleteError ? 'border-secondary' : 'border-border'}`}
                value={vendorDeletePasskey}
                onChange={(e) => { setVendorDeletePasskey(e.target.value); setVendorDeleteError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmVendorDelete()}
              />
              {vendorDeleteError && <p className="text-secondary text-[0.7rem] mb-3">{vendorDeleteError}</p>}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setPendingVendorDeleteId(null); setVendorDeletePasskey(''); setVendorDeleteError(''); }}
                  className="flex-1 py-2.5 rounded-md border border-border text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmVendorDelete}
                  disabled={vendorDeleteLoading || !vendorDeletePasskey}
                  className="flex-1 py-2.5 rounded-md bg-secondary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {vendorDeleteLoading ? 'Removing…' : 'Delete Vendor'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VENDOR MANAGEMENT SECTION */}
        <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2"><FaStore /> Vendor Management</h2>
          <p className="text-sm text-muted-foreground mb-6">View current vendors (admins) and transfer product ownership to a new email address.</p>

          <div className="mb-8">
            <h3 className="font-bold text-sm mb-3">Current Admins (Vendors)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {admins.filter(a => a.role !== 'CEO').map(admin => (
                <div key={admin.id} className="p-3 border border-border rounded-md bg-muted/30 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-primary truncate">{admin.email}</p>
                    {admin.vip && (
                      <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1 mr-2">
                        <FaCrown size={8} /> VIP
                      </span>
                    )}
                    {admin.specialStore && (
                      <span className="text-[10px] text-muted-foreground mt-1 inline-block truncate max-w-full">
                        Store: <span className="font-bold text-foreground">{admin.specialStore.name}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* VIP Toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer" title={admin.vip ? 'Remove VIP access' : 'Grant VIP access (see all)'}>
                      <input
                        type="checkbox"
                        checked={!!admin.vip}
                        onChange={() => handleToggleVip(admin.id, !!admin.vip)}
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="text-[0.6rem] font-bold text-muted-foreground">VIP</span>
                    </label>
                    {/* Special Store Settings */}
                    <button
                      onClick={() => {
                        setEditStoreAdminId(admin.id);
                        setEditStoreAdminEmail(admin.email);
                      }}
                      className={`${admin.specialStore ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted-foreground/10'} p-2 rounded-full transition-colors ml-2`}
                      title="Special Store Settings"
                    >
                      <FaStore size={12} />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => openVendorDeleteOverlay(admin.id, admin.email)}
                      className="text-secondary p-2 hover:bg-secondary/10 rounded-full transition-colors"
                      title="Delete vendor"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {admins.filter(a => a.role !== 'CEO').length === 0 && (
                <p className="text-xs text-muted-foreground">No admin vendors found.</p>
              )}
            </div>
          </div>

          <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><FaExchangeAlt /> Transfer Product Access</h3>
          <p className="text-[0.65rem] text-muted-foreground mb-4 italic">* Both Old and New Vendor searches will look up your current Admin Staff.</p>

          {oldVendorEmail && newVendorEmail && oldVendorEmail === newVendorEmail && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs font-bold animate-pulse">
              ⚠️ Error: Old Vendor and New Vendor emails cannot be the same.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Old Vendor Searchable Input */}
            <div className="relative">
              <label className="block text-xs font-bold mb-2">Old Vendor Email</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Start typing to search..."
                  className="w-full p-3 pl-9 rounded-md border border-border bg-background text-sm"
                  value={oldVendorEmail || oldVendorSearch}
                  onChange={(e) => {
                    setOldVendorEmail('');
                    setOldVendorSearch(e.target.value);
                  }}
                  onFocus={() => setOldVendorFocused(true)}
                  onBlur={() => setTimeout(() => setOldVendorFocused(false), 200)}
                />
                <FaSearch className="absolute left-3 top-4 text-muted-foreground" size={12} />
                {oldVendorEmail && (
                  <button
                    onClick={() => { setOldVendorEmail(''); setOldVendorSearch(''); setOldVendorResults([]); }}
                    className="absolute right-2 top-3 text-muted-foreground hover:text-foreground p-1"
                  >
                    <FaTimes size={10} />
                  </button>
                )}
              </div>
              {/* Dropdown */}
              {oldVendorFocused && !oldVendorEmail && oldVendorSearch.length >= 2 && (
                <div className="absolute top-full left-0 w-full bg-card border border-border rounded-md shadow-xl mt-1 z-50 max-h-[300px] overflow-y-auto">
                  {oldVendorResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">No admin staff found</div>
                  ) : (
                    <>
                      {oldVendorResults.slice(0, oldVendorShowCount).map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setOldVendorEmail(u.email);
                            setOldVendorSearch('');
                            setOldVendorResults([]);
                          }}
                          className="w-full p-3 text-left hover:bg-muted border-b border-border last:border-0 flex flex-col"
                        >
                          <span className="font-bold text-sm">{u.displayName || 'Unnamed'}</span>
                          <span className="text-[10px] text-muted-foreground">{u.email}</span>
                        </button>
                      ))}
                      {oldVendorResults.length > oldVendorShowCount && (
                        <button
                          onClick={(e) => { e.preventDefault(); setOldVendorShowCount(prev => prev + 20); }}
                          className="w-full p-3 text-center text-xs font-bold text-primary hover:bg-primary/5 flex items-center justify-center gap-1"
                        >
                          <FaChevronDown size={10} /> View More ({oldVendorResults.length - oldVendorShowCount} remaining)
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* New Vendor Searchable Input */}
            <div className="relative">
              <label className="block text-xs font-bold mb-2">New Vendor Email</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Start typing to search..."
                  className="w-full p-3 pl-9 rounded-md border border-border bg-background text-sm"
                  value={newVendorEmail || newVendorSearch}
                  onChange={(e) => {
                    setNewVendorEmail('');
                    setNewVendorSearch(e.target.value);
                  }}
                  onFocus={() => setNewVendorFocused(true)}
                  onBlur={() => setTimeout(() => setNewVendorFocused(false), 200)}
                />
                <FaSearch className="absolute left-3 top-4 text-muted-foreground" size={12} />
                {newVendorEmail && (
                  <button
                    onClick={() => { setNewVendorEmail(''); setNewVendorSearch(''); setNewVendorResults([]); }}
                    className="absolute right-2 top-3 text-muted-foreground hover:text-foreground p-1"
                  >
                    <FaTimes size={10} />
                  </button>
                )}
              </div>
              {/* Dropdown */}
              {newVendorFocused && !newVendorEmail && newVendorSearch.length >= 2 && (
                <div className="absolute top-full left-0 w-full bg-card border border-border rounded-md shadow-xl mt-1 z-50 max-h-[300px] overflow-y-auto">
                  {newVendorResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">No admin staff found</div>
                  ) : (
                    <>
                      {newVendorResults.slice(0, newVendorShowCount).map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setNewVendorEmail(u.email);
                            setNewVendorSearch('');
                            setNewVendorResults([]);
                          }}
                          className="w-full p-3 text-left hover:bg-muted border-b border-border last:border-0 flex flex-col"
                        >
                          <span className="font-bold text-sm">{u.displayName || 'Unnamed'}</span>
                          <span className="text-[10px] text-muted-foreground">{u.email}</span>
                        </button>
                      ))}
                      {newVendorResults.length > newVendorShowCount && (
                        <button
                          onClick={(e) => { e.preventDefault(); setNewVendorShowCount(prev => prev + 20); }}
                          className="w-full p-3 text-center text-xs font-bold text-primary hover:bg-primary/5 flex items-center justify-center gap-1"
                        >
                          <FaChevronDown size={10} /> View More ({newVendorResults.length - newVendorShowCount} remaining)
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleTransferVendor}
            disabled={transferLoading || !oldVendorEmail || !newVendorEmail || oldVendorEmail === newVendorEmail}
            className="w-full md:w-auto bg-primary text-white px-6 py-3 rounded-md font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:blur-[1px] disabled:cursor-not-allowed"
          >
            {transferLoading ? 'Transferring...' : 'Transfer Products'}
          </button>
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
                <Image src={imagePreview} alt="CEO Preview" fill className="object-cover" sizes="100px" />
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

        {/* STAR THRESHOLDS SECTION */}
        <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-2 flex items-center gap-2">
            <FaStar className="text-amber-400" /> Star Thresholds
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mb-6">
            Set the number of successful sales required for each star rating. Changes apply in real-time across all store pages.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {([1, 2, 3, 4, 5] as const).map((star) => (
              <div key={star} className="flex flex-col">
                <label className="text-xs md:text-sm font-bold mb-1.5 flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: star }).map((_, i) => (
                      <FaStar key={i} className="text-amber-400" size={10} />
                    ))}
                  </span>
                  {star} Star
                  <span className="relative group">
                    <FaInfoCircle className="text-muted-foreground cursor-help" size={12} />
                    <span className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 bg-foreground text-background p-2 rounded shadow-lg text-[10px] text-center z-50 pointer-events-none">
                      Minimum sales needed to earn a {star}-star rating.
                    </span>
                  </span>
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full p-2.5 rounded-md border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                  value={editableThresholds[star] ?? ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setEditableThresholds(prev => ({ ...prev, [star]: isNaN(val) ? 0 : val }));
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-6 mb-6 pt-4 border-t border-border">
            {/* SHIPPING MAXIMUM DATE / DAYS FIELD */}
            <div className="max-w-xs w-full">
              <label className="text-xs md:text-sm font-bold mb-1.5 flex items-center gap-1.5">
                <span>Shipping Maximum Date (Days)</span>
                <span className="relative group">
                  <FaInfoCircle className="text-muted-foreground cursor-help" size={12} />
                  <span className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 bg-foreground text-background p-2 rounded shadow-lg text-[10px] text-center z-50 pointer-events-none">
                    Maximum estimated delivery days shown to customer after payment and in WhatsApp notification.
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  className="w-full p-2.5 rounded-md border border-border bg-background text-sm font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                  value={shippingMaxDaysInput}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setShippingMaxDaysInput(isNaN(val) || val < 1 ? 1 : val);
                  }}
                />
                <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">Days</span>
              </div>
            </div>

            {/* NEW TAG DURATION FIELD */}
            <div className="max-w-xs w-full">
              <label className="text-xs md:text-sm font-bold mb-1.5 flex items-center gap-1.5">
                <span>NEW Tag Duration (Days)</span>
                <span className="relative group">
                  <FaInfoCircle className="text-muted-foreground cursor-help" size={12} />
                  <span className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 bg-foreground text-background p-2 rounded shadow-lg text-[10px] text-center z-50 pointer-events-none">
                    Number of days a newly added product will display the NEW tag.
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  className="w-full p-2.5 rounded-md border border-border bg-background text-sm font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                  value={newTagDurationDaysInput}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setNewTagDurationDaysInput(isNaN(val) || val < 1 ? 1 : val);
                  }}
                />
                <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">Days</span>
              </div>
            </div>

            {/* SPECIAL STORE MESSAGE WIPE DURATION FIELD */}
            <div className="max-w-xs w-full">
              <label className="text-xs md:text-sm font-bold mb-1.5 flex items-center gap-1.5">
                <span>Message Wipe Duration (Days)</span>
                <span className="relative group">
                  <FaInfoCircle className="text-muted-foreground cursor-help" size={12} />
                  <span className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 bg-foreground text-background p-2 rounded shadow-lg text-[10px] text-center z-50 pointer-events-none">
                    How long a special-store customer message thread should stay visible before it is wiped.
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="w-full p-2.5 rounded-md border border-border bg-background text-sm font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                  value={specialStoreMessageDurationDaysInput}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setSpecialStoreMessageDurationDaysInput(isNaN(val) || val < 1 ? 1 : val);
                  }}
                />
                <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">Days</span>
              </div>
            </div>
          </div>

          <button
            disabled={thresholdSaveLoading}
            onClick={() => setShowThresholdConfirm(true)}
            className="w-full md:w-auto bg-primary text-white px-8 py-3 rounded-md font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaSave size={14} /> Save Thresholds
          </button>
        </section>

        {/* STAR THRESHOLD CONFIRMATION MODAL */}
        {showThresholdConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card p-6 md:p-8 rounded-xl shadow-2xl max-w-md w-full border border-border animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                <FaStar className="text-amber-400" /> Confirm Threshold Update
              </h3>
              <p className="text-xs text-muted-foreground mb-5">
                Are you sure you want to update the star rating thresholds? This will take effect immediately across all store pages.
              </p>

              <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-2">
                {([1, 2, 3, 4, 5] as const).map((star) => (
                  <div key={star} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      {Array.from({ length: star }).map((_, i) => (
                        <FaStar key={i} className="text-amber-400" size={11} />
                      ))}
                      <span className="ml-1">{star} Star</span>
                    </span>
                    <span className="font-bold tabular-nums">
                      {editableThresholds[star] || 0} sales
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                  <span className="font-medium flex items-center gap-1.5">
                    🚚 Shipping Maximum Date
                  </span>
                  <span className="font-bold tabular-nums text-primary">
                    {shippingMaxDaysInput || 3} days
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2">
                  <span className="font-medium flex items-center gap-1.5">
                    🆕 New Tag Duration
                  </span>
                  <span className="font-bold tabular-nums text-primary">
                    {newTagDurationDaysInput || 5} days
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2">
                  <span className="font-medium flex items-center gap-1.5">
                    💬 Message Wipe Duration
                  </span>
                  <span className="font-bold tabular-nums text-primary">
                    {specialStoreMessageDurationDaysInput || 30} days
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowThresholdConfirm(false)}
                  className="px-5 py-2.5 bg-muted text-foreground rounded-md text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveThresholds}
                  disabled={thresholdSaveLoading}
                  className="px-5 py-2.5 bg-primary text-white rounded-md text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {thresholdSaveLoading ? 'Saving…' : 'Confirm & Save'}
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* SPECIAL STORE EDIT OVERLAY */}
        {editStoreAdminId && (
          <SpecialStoreEditOverlay
            adminId={editStoreAdminId}
            adminEmail={editStoreAdminEmail}
            isOpen={true}
            onClose={() => {
              setEditStoreAdminId(null);
              setEditStoreAdminEmail('');
            }}
          />
        )}
      </div>
    </AdminGuard>
  );
}
