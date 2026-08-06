'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaTimes, FaStore, FaImage } from 'react-icons/fa';
import { uploadImageToCloudinary } from '@/actions/upload';
import Image from 'next/image';
import { SpecialStore, generateStoreSlug, canEditStoreField } from '@/lib/specialStoreTypes';
import { useAdmin } from '@/hooks/useAdmin';
import { useStoreSales } from '@/hooks/useStoreSales';
import StoreRatingStars from '@/components/StoreRatingStars';

interface SpecialStoreEditOverlayProps {
  adminId: string;
  adminEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SpecialStoreEditOverlay({ adminId, adminEmail, isOpen, onClose }: SpecialStoreEditOverlayProps) {
  const { isCEO } = useAdmin();
  const { getVendorSales } = useStoreSales();
  const salesCount = getVendorSales(adminEmail);
  const [loading, setLoading] = useState(false);
  const [storeData, setStoreData] = useState<Partial<SpecialStore>>({});

  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [bannerUrlInput, setBannerUrlInput] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [doesSwapping, setDoesSwapping] = useState<'yes' | 'no'>('no');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (isOpen && adminId) {
      // Fetch current admin doc to get specialStore data
      const fetchAdmin = async () => {
        const docRef = doc(db, 'admins', adminId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.specialStore) {
            setStoreData(data.specialStore);
            setName(data.specialStore.name || '');
            setSlogan(data.specialStore.slogan || '');
            setBannerPreview(data.specialStore.banner || '');
            setBannerUrlInput(data.specialStore.banner || '');
            setAccountNumber(data.specialStore.accountNumber || '');
            setAccountName(data.specialStore.accountName || '');
            setBankName(data.specialStore.bankName || '');
            setPhoneNumber(data.specialStore.phoneNumber || '');
            setDoesSwapping(data.specialStore.doesSwapping === 'yes' ? 'yes' : 'no');
            setIsEnabled(true);
          } else {
            setStoreData({});
            setName('');
            setSlogan('');
            setBannerPreview('');
            setBannerUrlInput('');
            setAccountNumber('');
            setAccountName('');
            setBankName('');
            setPhoneNumber('');
            setDoesSwapping('no');
            setIsEnabled(false);
          }
        }
      };
      fetchAdmin();
    } else {
      setBannerFile(null);
    }
  }, [isOpen, adminId]);

  if (!isOpen) return null;

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
      setBannerUrlInput('');
    }
  };

  const handleSave = async () => {
    if (isEnabled && !name.trim()) {
      toast.error('Store Name is required when Special Store is enabled.');
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'admins', adminId);

      if (!isEnabled) {
        // Remove specialStore completely
        await updateDoc(docRef, { specialStore: null });
        toast.success('Special Store disabled and cleared.');
        onClose();
        return;
      }

      // Check monthly edit restrictions for non-CEOs
      const nameEditCheck = canEditStoreField(storeData.nameEditDates || storeData.lastNameEdit, isCEO);
      const bannerEditCheck = canEditStoreField(storeData.bannerEditDates || storeData.lastBannerEdit, isCEO);
      const accountEditCheck = canEditStoreField(storeData.accountNumberEditDates, isCEO);
      const accountNameEditCheck = canEditStoreField(storeData.accountNameEditDates, isCEO);
      const bankNameEditCheck = canEditStoreField(storeData.bankNameEditDates, isCEO);
      const phoneEditCheck = canEditStoreField(storeData.phoneNumberEditDates, isCEO);

      let bannerUrl = storeData.banner || '';
      let bannerEdited = false;
      let nameEdited = false;
      let accountEdited = false;
      let accountNameEdited = false;
      let bankNameEdited = false;
      let phoneEdited = false;

      if (name.trim() !== storeData.name) {
        if (!nameEditCheck.allowed) {
          toast.error(`Cannot edit name. ${nameEditCheck.reason} Available on: ${nameEditCheck.nextEditDate?.toLocaleDateString()}`);
          setLoading(false);
          return;
        }
        nameEdited = true;
      }

      if (bannerFile) {
        if (!bannerEditCheck.allowed) {
          toast.error(`Cannot edit banner. ${bannerEditCheck.reason} Available on: ${bannerEditCheck.nextEditDate?.toLocaleDateString()}`);
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', bannerFile);
        const result = await uploadImageToCloudinary(formData);
        if (result.error) throw new Error(result.error);
        bannerUrl = result.secure_url;
        bannerEdited = true;
      } else if (bannerUrlInput.trim() !== (storeData.banner || '')) {
        if (!bannerEditCheck.allowed) {
          toast.error(`Cannot edit banner. ${bannerEditCheck.reason} Available on: ${bannerEditCheck.nextEditDate?.toLocaleDateString()}`);
          setLoading(false);
          return;
        }
        bannerUrl = bannerUrlInput.trim();
        bannerEdited = true;
      }

      if (accountNumber.trim() !== (storeData.accountNumber || '')) {
        if (!accountEditCheck.allowed) {
          toast.error(`Cannot edit account number. ${accountEditCheck.reason} Available on: ${accountEditCheck.nextEditDate?.toLocaleDateString()}`);
          setLoading(false);
          return;
        }
        accountEdited = true;
      }

      if (accountName.trim() !== (storeData.accountName || '')) {
        if (!accountNameEditCheck.allowed) {
          toast.error(`Cannot edit account name. ${accountNameEditCheck.reason} Available on: ${accountNameEditCheck.nextEditDate?.toLocaleDateString()}`);
          setLoading(false);
          return;
        }
        accountNameEdited = true;
      }

      if (bankName.trim() !== (storeData.bankName || '')) {
        if (!bankNameEditCheck.allowed) {
          toast.error(`Cannot edit bank name. ${bankNameEditCheck.reason} Available on: ${bankNameEditCheck.nextEditDate?.toLocaleDateString()}`);
          setLoading(false);
          return;
        }
        bankNameEdited = true;
      }

      if (phoneNumber.trim() !== (storeData.phoneNumber || '')) {
        if (!phoneEditCheck.allowed) {
          toast.error(`Cannot edit phone number. ${phoneEditCheck.reason} Available on: ${phoneEditCheck.nextEditDate?.toLocaleDateString()}`);
          setLoading(false);
          return;
        }
        phoneEdited = true;
      }

      let nameEditDates = storeData.nameEditDates || (storeData.lastNameEdit ? [storeData.lastNameEdit] : []);
      let bannerEditDates = storeData.bannerEditDates || (storeData.lastBannerEdit ? [storeData.lastBannerEdit] : []);
      let accountNumberEditDates = storeData.accountNumberEditDates || [];
      let accountNameEditDates = storeData.accountNameEditDates || [];
      let bankNameEditDates = storeData.bankNameEditDates || [];
      let phoneNumberEditDates = storeData.phoneNumberEditDates || [];

      if (nameEdited) {
        const now = new Date();
        nameEditDates = nameEditDates.filter(d => {
          const date = new Date(d);
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        });
        nameEditDates.push(new Date().toISOString());
      }
      if (bannerEdited) {
        const now = new Date();
        bannerEditDates = bannerEditDates.filter(d => {
          const date = new Date(d);
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        });
        bannerEditDates.push(new Date().toISOString());
      }
      if (accountEdited) {
        const now = new Date();
        accountNumberEditDates = accountNumberEditDates.filter(d => {
          const date = new Date(d);
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        });
        accountNumberEditDates.push(new Date().toISOString());
      }
      if (accountNameEdited) {
        const now = new Date();
        accountNameEditDates = accountNameEditDates.filter(d => {
          const date = new Date(d);
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        });
        accountNameEditDates.push(new Date().toISOString());
      }
      if (bankNameEdited) {
        const now = new Date();
        bankNameEditDates = bankNameEditDates.filter(d => {
          const date = new Date(d);
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        });
        bankNameEditDates.push(new Date().toISOString());
      }
      if (phoneEdited) {
        const now = new Date();
        phoneNumberEditDates = phoneNumberEditDates.filter(d => {
          const date = new Date(d);
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        });
        phoneNumberEditDates.push(new Date().toISOString());
      }

      const updatedStoreData: SpecialStore = {
        name: name.trim(),
        slug: generateStoreSlug(name),
        slogan: slogan.trim(),
        banner: bannerUrl,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        bankName: bankName.trim(),
        phoneNumber: phoneNumber.trim(),
        doesSwapping,
        ownerEmail: adminEmail,
        ownerUid: adminId,
        lastNameEdit: nameEdited ? new Date().toISOString() : (storeData.lastNameEdit || new Date().toISOString()),
        lastBannerEdit: bannerEdited ? new Date().toISOString() : (storeData.lastBannerEdit || new Date().toISOString()),
        nameEditDates,
        bannerEditDates,
        accountNumberEditDates,
        accountNameEditDates,
        bankNameEditDates,
        phoneNumberEditDates
      };

      await updateDoc(docRef, { specialStore: updatedStoreData });
      toast.success('Special Store settings saved!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-card w-full max-w-lg max-h-[90vh] rounded-xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        <div className="p-4 md:p-6 border-b border-border flex justify-between items-center bg-muted/30">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <FaStore className="text-primary" /> Special Store Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-6">
          {isCEO && (
            <label className="flex items-center gap-3 cursor-pointer p-3 border border-border rounded-xl hover:bg-muted/30 transition-colors">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="accent-primary w-5 h-5"
              />
              <div>
                <span className="font-bold block">Enable Special Store</span>
                <span className="text-xs text-muted-foreground block">Allow this vendor to have a branded storefront</span>
              </div>
            </label>
          )}

          {(isCEO ? isEnabled : true) && (
            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
              <div onClick={() => {
                const nameEditCheck = canEditStoreField(storeData.nameEditDates || storeData.lastNameEdit, isCEO);
                if (!isCEO && !nameEditCheck.allowed) {
                  toast.error('Please contact CEO to change store name again this month.');
                }
              }}>
                <label className="block text-sm font-bold mb-1">Store Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isCEO && !canEditStoreField(storeData.nameEditDates || storeData.lastNameEdit, isCEO).allowed}
                  className="w-full p-3 rounded-xl border border-border bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="e.g. Zara Boutique"
                />
                {!isCEO && <p className="text-[10px] text-muted-foreground mt-1">Note: You can only change the store name twice per month  or contact CEO.</p>}
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Do you do Swapping?</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 cursor-pointer">
                    <input
                      type="radio"
                      name="doesSwapping"
                      value="yes"
                      checked={doesSwapping === 'yes'}
                      onChange={() => setDoesSwapping('yes')}
                      className="accent-primary"
                    />
                    <span className="text-sm font-semibold">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 cursor-pointer">
                    <input
                      type="radio"
                      name="doesSwapping"
                      value="no"
                      checked={doesSwapping === 'no'}
                      onChange={() => setDoesSwapping('no')}
                      className="accent-primary"
                    />
                    <span className="text-sm font-semibold">No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Slogan (Optional)</label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-background"
                  placeholder="e.g. Your daily fashion"
                />
                <div className="mt-2.5 p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col gap-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Store Rating & Performance</span>
                  <StoreRatingStars salesCount={salesCount} textColor="text-foreground" className="mt-1" />
                </div>
              </div>

              <div onClick={() => {
                const bannerEditCheck = canEditStoreField(storeData.bannerEditDates || storeData.lastBannerEdit, isCEO);
                if (!isCEO && !bannerEditCheck.allowed) {
                  toast.error('Please contact CEO to change banner again this month.');
                }
              }}>
                <label className="block text-sm font-bold mb-1">Store Banner (URL or Upload File)</label>
                <input
                  type="text"
                  value={bannerUrlInput}
                  onChange={(e) => {
                    setBannerUrlInput(e.target.value);
                    setBannerPreview(e.target.value);
                    setBannerFile(null);
                  }}
                  disabled={!isCEO && !canEditStoreField(storeData.bannerEditDates || storeData.lastBannerEdit, isCEO).allowed}
                  className="w-full p-3 rounded-xl border border-border bg-background mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Paste image URL here..."
                />
                <div className={`border-2 border-dashed border-border rounded-xl p-4 text-center transition-colors relative ${(!isCEO && !canEditStoreField(storeData.bannerEditDates || storeData.lastBannerEdit, isCEO).allowed) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/50'}`}>
                  {bannerPreview ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2 border border-border">
                      <img src={bannerPreview} alt="Banner Preview" className="object-cover w-full h-full" />
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center text-muted-foreground">
                      <FaImage size={32} className="mb-2 opacity-50" />
                      <span className="text-sm">Click to upload banner</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    disabled={!isCEO && !canEditStoreField(storeData.bannerEditDates || storeData.lastBannerEdit, isCEO).allowed}
                    className={`absolute inset-0 opacity-0 ${(!isCEO && !canEditStoreField(storeData.bannerEditDates || storeData.lastBannerEdit, isCEO).allowed) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  />
                </div>
                {!isCEO && <p className="text-[10px] text-muted-foreground mt-1">Note: You can only change the banner twice per month.</p>}
              </div>

              <div onClick={() => {
                const accountEditCheck = canEditStoreField(storeData.accountNumberEditDates, isCEO);
                if (!isCEO && !accountEditCheck.allowed) {
                  toast.error('Please contact CEO to change account number again this month.');
                }
              }}>
                <label className="block text-sm font-bold mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  disabled={!isCEO && !canEditStoreField(storeData.accountNumberEditDates, isCEO).allowed}
                  className="w-full p-3 rounded-xl border border-border bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="e.g. 1234567890"
                />
                {!isCEO && <p className="text-[10px] text-muted-foreground mt-1">Note: You can only change the account number twice per month.</p>}
              </div>

              <div onClick={() => {
                const accountNameEditCheck = canEditStoreField(storeData.accountNameEditDates, isCEO);
                if (!isCEO && !accountNameEditCheck.allowed) {
                  toast.error('Please contact CEO to change account name again this month.');
                }
              }}>
                <label className="block text-sm font-bold mb-1">Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  disabled={!isCEO && !canEditStoreField(storeData.accountNameEditDates, isCEO).allowed}
                  className="w-full p-3 rounded-xl border border-border bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="e.g. John Doe"
                />
                {!isCEO && <p className="text-[10px] text-muted-foreground mt-1">Note: You can only change the account name twice per month.</p>}
              </div>

              <div onClick={() => {
                const bankNameEditCheck = canEditStoreField(storeData.bankNameEditDates, isCEO);
                if (!isCEO && !bankNameEditCheck.allowed) {
                  toast.error('Please contact CEO to change bank name again this month.');
                }
              }}>
                <label className="block text-sm font-bold mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={!isCEO && !canEditStoreField(storeData.bankNameEditDates, isCEO).allowed}
                  className="w-full p-3 rounded-xl border border-border bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="e.g. Access Bank"
                />
                {!isCEO && <p className="text-[10px] text-muted-foreground mt-1">Note: You can only change the bank name twice per month.</p>}
              </div>

              <div onClick={() => {
                const phoneEditCheck = canEditStoreField(storeData.phoneNumberEditDates, isCEO);
                if (!isCEO && !phoneEditCheck.allowed) {
                  toast.error('Please contact CEO to change phone number again this month.');
                }
              }}>
                <label className="block text-sm font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={!isCEO && !canEditStoreField(storeData.phoneNumberEditDates, isCEO).allowed}
                  className="w-full p-3 rounded-xl border border-border bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="e.g. 08012345678"
                />
                {!isCEO && <p className="text-[10px] text-muted-foreground mt-1">Note: You can only change the phone number twice per month.</p>}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold border border-border rounded-lg hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
