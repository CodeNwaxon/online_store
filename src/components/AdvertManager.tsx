'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, query, where } from 'firebase/firestore';
import { FaAd, FaSave, FaTimes, FaLock, FaChevronDown, FaCheck, FaImages } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { AdminData } from '@/hooks/useAdmin';
import Image from 'next/image';

interface AdvertManagerProps {
  collectionName: string;
  isCEO: boolean;
  adminData: AdminData | null;
  products: any[];
}

interface AdvertSettings {
  maxSlots: number;
  minSlots: number;
  allocations: Record<string, number>;
  selections: Record<string, string[]>;
}

export default function AdvertManager({ collectionName, isCEO, adminData, products }: AdvertManagerProps) {
  const [settings, setSettings] = useState<AdvertSettings>({
    maxSlots: 10,
    minSlots: 3,
    allocations: {},
    selections: {},
  });
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<any[]>([]);

  // Passkey Modal State
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [pendingMaxSlots, setPendingMaxSlots] = useState<number | null>(null);

  // Vendor Panel State
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [slotInput, setSlotInput] = useState<string>('');

  // My Selection State
  const [isSelectionExpanded, setIsSelectionExpanded] = useState(false);
  const [selectedVendorForAdverts, setSelectedVendorForAdverts] = useState<string>('');

  const hasConfigAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes(`/ADMIN/${collectionName.toUpperCase().replace('_', '-')}`));

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', `advert_${collectionName}`), (snap) => {
      if (snap.exists()) {
        setSettings({
          maxSlots: snap.data().maxSlots ?? 10,
          minSlots: snap.data().minSlots ?? 3,
          allocations: snap.data().allocations || {},
          selections: snap.data().selections || {},
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [collectionName]);

  useEffect(() => {
    if (hasConfigAccess) {
      const fetchAdmins = async () => {
        const q = query(collection(db, 'admins'), where('specialStore', '!=', null));
        const snap = await getDocs(q);
        const stores = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((a: any) => a.assignedRoutes?.includes(`/ADMIN/${collectionName.toUpperCase().replace('_', '-')}`) || a.role === 'CEO');
        setAdmins(stores);
      };
      fetchAdmins();
    }
  }, [hasConfigAccess, collectionName]);

  useEffect(() => {
    if (hasConfigAccess && !selectedVendorForAdverts) {
      if (settings.allocations[adminData?.email || ''] > 0) {
        setSelectedVendorForAdverts(adminData?.email || '');
      } else {
        const firstAllocated = Object.keys(settings.allocations).find(k => settings.allocations[k] > 0);
        if (firstAllocated) {
          setSelectedVendorForAdverts(firstAllocated);
        }
      }
    }
  }, [hasConfigAccess, settings.allocations, adminData?.email, selectedVendorForAdverts]);

  const saveSettings = async (newSettings: Partial<AdvertSettings>) => {
    try {
      await setDoc(doc(db, 'settings', `advert_${collectionName}`), newSettings, { merge: true });
      toast.success('Advert settings saved', { id: 'advert-settings-saved' });
    } catch (error) {
      toast.error('Failed to save settings', { id: 'advert-settings-error' });
    }
  };

  const handleMaxSlotsRequest = (newMax: number) => {
    setPendingMaxSlots(newMax);
    setShowPasskeyModal(true);
  };

  const verifyPasskeyAndSaveMaxSlots = async () => {
    setPasskeyError('');
    try {
      const snap = await getDoc(doc(db, 'settings', 'general'));
      const currentPasskey = snap.data()?.passkey || 'admin1234';

      if (passkeyInput !== currentPasskey) {
        setPasskeyError('Incorrect CEO passkey.');
        return;
      }

      await saveSettings({ maxSlots: pendingMaxSlots! });
      setShowPasskeyModal(false);
      setPasskeyInput('');
      setPendingMaxSlots(null);
    } catch (error) {
      setPasskeyError('Error verifying passkey.');
    }
  };

  const handleAllocateSlots = () => {
    if (!selectedVendor || !slotInput) return;
    const slots = parseInt(slotInput, 10);
    if (isNaN(slots) || slots < 0) {
      toast.error('Invalid slot number');
      return;
    }

    if (slots !== 0 && slots < settings.minSlots) {
      toast.error(`Slot assignment must be at least the Min Slots (${settings.minSlots}) or 0.`);
      return;
    }

    const currentTotal = Object.entries(settings.allocations)
      .filter(([email]) => email !== selectedVendor)
      .reduce((sum, [_, count]) => sum + count, 0);

    if (currentTotal + slots > settings.maxSlots) {
      toast.error(`Cannot exceed max slots (${settings.maxSlots}). Available: ${settings.maxSlots - currentTotal}`);
      return;
    }

    const newAllocations = { ...settings.allocations, [selectedVendor]: slots };
    saveSettings({ allocations: newAllocations });
    setSelectedVendor(null);
    setSlotInput('');
  };

  const myEmail = adminData?.email || '';
  const myAllocatedSlots = settings.allocations[myEmail] || 0;

  const activeSelectionEmail = (hasConfigAccess && selectedVendorForAdverts) ? selectedVendorForAdverts : myEmail;
  const activeAllocatedSlots = settings.allocations[activeSelectionEmail] || 0;
  const activeSelections = settings.selections[activeSelectionEmail] || [];

  const handleToggleAdvertProduct = (productId: string, targetEmail: string) => {
    const currentSelections = settings.selections[targetEmail] || [];
    let newSelections = [];
    const targetAllocatedSlots = settings.allocations[targetEmail] || 0;

    if (currentSelections.includes(productId)) {
      newSelections = currentSelections.filter(id => id !== productId);
    } else {
      if (currentSelections.length >= targetAllocatedSlots) {
        toast.error(`Limit of ${targetAllocatedSlots} advert slots reached.`, { id: 'advert-limit' });
        return;
      }
      newSelections = [...currentSelections, productId];
    }

    saveSettings({
      selections: {
        ...settings.selections,
        [targetEmail]: newSelections
      }
    });
  };

  if (loading) return null;
  if (!hasConfigAccess && myAllocatedSlots === 0) return null;

  const totalAllocated = Object.values(settings.allocations).reduce((sum, count) => sum + count, 0);
  const remainingSlots = settings.maxSlots - totalAllocated;

  return (
    <div className="mb-8 space-y-4">
      {hasConfigAccess && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
          <div
            className="bg-orange-50 px-2 py-4 md:p-4 flex items-center justify-between cursor-pointer hover:bg-orange-100 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center text-orange-600">
                <FaAd size={20} />
              </div>
              <div>
                <h2 className="font-bold text-orange-900">Advert Billboard Configuration</h2>
                <p className="text-xs text-orange-700">Manage advert slots for {collectionName.replace('_', ' ')}</p>
              </div>
            </div>
            <FaChevronDown className={`text-orange-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>

          {isExpanded && (
            <div className="px-3 py-6 md:p-6 border-t border-orange-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Max Advert Slots (Total)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={pendingMaxSlots ?? settings.maxSlots}
                      onChange={(e) => setPendingMaxSlots(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-md outline-none focus:border-slate-500"
                    />
                    {pendingMaxSlots !== null && pendingMaxSlots !== settings.maxSlots && (
                      <button onClick={() => handleMaxSlotsRequest(pendingMaxSlots)} className="bg-slate-800 text-white px-3 py-2 rounded-md text-xs font-bold whitespace-nowrap">
                        Update
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Min Slots per Advert View</label>
                  <input
                    type="number"
                    value={settings.minSlots}
                    onChange={(e) => saveSettings({ minSlots: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded-md outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
                  Vendor Allocations
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {remainingSlots} slots remaining (out of {settings.maxSlots})
                  </span>
                </h3>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {admins.map(admin => {
                    const allocated = settings.allocations[admin.email] || 0;
                    const isSelected = selectedVendor === admin.email;

                    return (
                      <div key={admin.uid} className={`border rounded-lg p-2 ${isSelected ? 'border-orange-400 bg-orange-50/30' : 'border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedVendor(isSelected ? null : admin.email)}>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-300'}`}>
                              {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-800">{admin.specialStore?.name || admin.name || admin.email}</div>
                              <div className="text-xs text-slate-500">{admin.specialStore?.ownerPhone || admin.email}</div>
                            </div>
                          </div>

                          {allocated > 0 && !isSelected && (
                            <div className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                              {allocated} slots
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <div className="mt-3 pl-7 flex gap-2">
                            <input
                              type="number"
                              placeholder="Slots"
                              value={slotInput}
                              onChange={(e) => setSlotInput(e.target.value)}
                              className="w-24 p-1.5 border border-orange-200 rounded text-sm outline-none focus:border-orange-400"
                            />
                            <button onClick={handleAllocateSlots} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">
                              Assign
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {admins.length === 0 && <div className="text-sm text-slate-500">No special stores found for this category.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vendor Advert Selection Section */}
      {(hasConfigAccess || myAllocatedSlots > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden mt-4">
          <div
            className="bg-purple-50 p-3 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-purple-100 transition-colors gap-4"
            onClick={() => setIsSelectionExpanded(!isSelectionExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center text-purple-700 shrink-0">
                <FaImages size={20} />
              </div>
              <div>
                <h2 className="font-bold text-purple-900">{hasConfigAccess ? 'Vendor Advert Selection' : 'My Advert Selection'}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-purple-700">
                    {activeSelections.length} of {activeAllocatedSlots} slots used
                  </p>
                  {activeSelections.length > 0 && activeSelections.length < settings.minSlots && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <FaTimes size={8} /> Below Minimum ({settings.minSlots})
                    </span>
                  )}
                  {activeSelections.length >= settings.minSlots && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <FaCheck size={8} /> Min Reached
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
              {hasConfigAccess && (
                <select
                  value={selectedVendorForAdverts || myEmail}
                  onChange={(e) => setSelectedVendorForAdverts(e.target.value)}
                  className="p-1.5 text-sm border border-purple-300 rounded outline-none text-purple-900 bg-white"
                >
                  {admins.filter(a => settings.allocations[a.email] > 0).map(a => (
                    <option key={a.email} value={a.email}>{a.specialStore?.name || a.name || a.email} ({settings.allocations[a.email]} slots)</option>
                  ))}
                  {settings.allocations[myEmail] > 0 && !admins.find(a => a.email === myEmail) && (
                    <option value={myEmail}>Me ({settings.allocations[myEmail]} slots)</option>
                  )}
                  {Object.keys(settings.allocations).length === 0 && (
                    <option value={myEmail}>No slots assigned yet</option>
                  )}
                </select>
              )}
              <FaChevronDown className={`text-purple-500 transition-transform ${isSelectionExpanded ? 'rotate-180' : ''}`} onClick={() => setIsSelectionExpanded(!isSelectionExpanded)} />
            </div>
          </div>

          {isSelectionExpanded && (
            <div className="p-3 border-t border-purple-100 bg-slate-50/50">
              {activeAllocatedSlots === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {activeSelectionEmail === myEmail ? "You don't have any advert slots assigned." : "This vendor has no advert slots assigned."}
                </div>
              ) : (
                <>
                  <div className="flex flex-col mb-4">
                    <p className="text-xs md:text-sm text-slate-600">Click a product to select or deselect it for the advert billboard.</p>
                    {activeAllocatedSlots > 0 && activeSelections.length < settings.minSlots && (
                      <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1">
                        <FaTimes /> You must select at least {settings.minSlots} products before your adverts will appear.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {products.filter(p => p.vendor === activeSelectionEmail).map(product => {
                      const isSelected = activeSelections.includes(product.id);
                      const isMinReached = activeSelections.length >= settings.minSlots;
                      const borderClass = isSelected
                        ? (isMinReached ? 'border-green-500 shadow-md transform scale-[0.98]' : 'border-red-500 shadow-md transform scale-[0.98]')
                        : 'border-transparent hover:border-purple-300';

                      return (
                        <div
                          key={product.id}
                          onClick={() => handleToggleAdvertProduct(product.id, activeSelectionEmail)}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${borderClass}`}
                        >
                          <Image
                            src={product.images?.[0] || product.image || '/images/placeholder.png'}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          {isSelected && (
                            <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm ${isMinReached ? 'bg-green-500' : 'bg-red-500'}`}>
                              <FaCheck size={12} />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 text-white text-[10px] md:text-xs font-bold truncate">
                            {product.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {products.filter(p => p.vendor === activeSelectionEmail).length === 0 && (
                    <div className="text-center py-8 text-slate-500">No products found for {activeSelectionEmail}.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* CEO Passkey Modal */}
      {showPasskeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-4 md:p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-slate-800 mb-4">
              <FaLock className="text-slate-400" size={24} />
              <h3 className="font-bold text-xl">CEO Authorization</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Please enter the CEO passkey to change the global max advert slots limit to {pendingMaxSlots}.
            </p>
            <input
              type="password"
              placeholder="Enter CEO Passkey"
              className="text-sm w-full p-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-500 outline-none transition-colors"
              value={passkeyInput}
              onChange={(e) => setPasskeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyPasskeyAndSaveMaxSlots()}
            />
            {passkeyError && <p className="text-red-500 text-xs mt-2 font-bold">{passkeyError}</p>}

            <div className="flex gap-3 mt-8">
              <button onClick={() => {
                setShowPasskeyModal(false);
                setPendingMaxSlots(null);
                setPasskeyError('');
                setPasskeyInput('');
              }} className="text-xs md:text-sm flex-1 px-2 md:px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={verifyPasskeyAndSaveMaxSlots} className="text-xs md:text-sm flex-1 px-2 md:px-4 py-2.5 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2">
                <FaCheck /> Verify & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
