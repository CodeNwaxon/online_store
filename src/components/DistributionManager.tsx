'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaTimes, FaPlus, FaTrash, FaMapMarkerAlt, FaLock, FaEdit } from 'react-icons/fa';

interface Area {
  id: string;
  state: string;
  city: string;
  address: string;
  mapLocation: string;
  prices: {
    'extra-large': number;
    'large': number;
    'medium': number;
    'small': number;
    'extra-small': number;
  };
  isActive?: boolean;
}

interface DistributionManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DistributionManager({ isOpen, onClose }: DistributionManagerProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editFormData, setEditFormData] = useState({ state: '', city: '', address: '', mapLocation: '', isActive: true });
  const [editPrices, setEditPrices] = useState({ 'extra-large': '', 'large': '', 'medium': '', 'small': '', 'extra-small': '' });
  const [editLoading, setEditLoading] = useState(false);

  // Password protection state
  const [passwordPrompt, setPasswordPrompt] = useState<{ isOpen: boolean, action: 'create' | 'delete', targetId?: string }>({ isOpen: false, action: 'create' });
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    state: '',
    city: '',
    address: '',
    mapLocation: '',
    isActive: true,
  });

  const [prices, setPrices] = useState({
    'extra-large': '',
    'large': '',
    'medium': '',
    'small': '',
    'extra-small': ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = onSnapshot(collection(db, 'distribution_areas'), (snap) => {
      const fetchedAreas = snap.docs.map(d => ({ id: d.id, ...d.data() } as Area));
      setAreas(fetchedAreas);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const currentPasskey = settingsDoc.data()?.passkey || 'admin1234';
      if (password === currentPasskey) {
        if (passwordPrompt.action === 'create') {
          setIsCreating(true);
        } else if (passwordPrompt.action === 'delete' && passwordPrompt.targetId) {
          handleDelete(passwordPrompt.targetId);
        }
        setPasswordPrompt({ isOpen: false, action: 'create' });
        setPassword('');
      } else {
        toast.error('Incorrect CEO Password');
      }
    } catch (error) {
      toast.error('Failed to verify password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newArea = {
        state: formData.state.trim().toLowerCase(),
        city: formData.city.trim().toLowerCase(),
        address: formData.address.trim(),
        mapLocation: formData.mapLocation.trim(),
        prices: {
          'extra-large': Number(prices['extra-large']),
          'large': Number(prices['large']),
          'medium': Number(prices['medium']),
          'small': Number(prices['small']),
          'extra-small': Number(prices['extra-small'])
        },
        isActive: formData.isActive
      };

      await addDoc(collection(db, 'distribution_areas'), newArea);
      toast.success('Area created successfully!');
      setIsCreating(false);
      setFormData({ state: '', city: '', address: '', mapLocation: '', isActive: true });
      setPrices({ 'extra-large': '', 'large': '', 'medium': '', 'small': '', 'extra-small': '' });
    } catch (error) {
      console.error("Error creating area:", error);
      toast.error('Failed to create area');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'distribution_areas', id));
      toast.success('Area deleted successfully');
    } catch (error) {
      toast.error('Failed to delete area');
    }
  };

  const openEditArea = (area: Area) => {
    setEditingArea(area);
    setEditFormData({ state: area.state, city: area.city, address: area.address, mapLocation: area.mapLocation, isActive: area.isActive ?? true });
    setEditPrices({
      'extra-large': area.prices['extra-large'].toString(),
      'large': area.prices['large'].toString(),
      'medium': area.prices['medium'].toString(),
      'small': area.prices['small'].toString(),
      'extra-small': area.prices['extra-small'].toString(),
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArea) return;
    setEditLoading(true);
    try {
      await updateDoc(doc(db, 'distribution_areas', editingArea.id), {
        state: editFormData.state.trim().toLowerCase(),
        city: editFormData.city.trim().toLowerCase(),
        address: editFormData.address.trim(),
        mapLocation: editFormData.mapLocation.trim(),
        prices: {
          'extra-large': Number(editPrices['extra-large']),
          'large': Number(editPrices['large']),
          'medium': Number(editPrices['medium']),
          'small': Number(editPrices['small']),
          'extra-small': Number(editPrices['extra-small']),
        },
        isActive: editFormData.isActive
      });
      toast.success('Area updated successfully!');
      setEditingArea(null);
    } catch (error) {
      toast.error('Failed to update area');
    } finally {
      setEditLoading(false);
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col md:flex-row p-1 md:p-8 items-center justify-center">
      <div className="bg-background rounded md:rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl">

        {/* Header */}
        <div className="relative flex flex-col md:flex-row gap-3 md:justify-between md:items-center px-2 py-4 md:p-6 border-b border-border bg-card">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FaMapMarkerAlt className="text-primary" /> Distribution Areas & Fees
          </h2>
          <div className="flex  items-center gap-4">
            {!isCreating && (
              <button
                onClick={() => setPasswordPrompt({ isOpen: true, action: 'create' })}
                className="bg-primary text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-primary-hover transition-colors"
              >
                <FaPlus size={12} /> Create New Area
              </button>
            )}
            <button onClick={onClose} className="absolute top-4 right-2 md:static text-muted-foreground hover:text-foreground">
              <FaTimes size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto md:p-6 p-4 bg-muted/30">
          {isCreating ? (
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Create New Area</h3>
                <button onClick={() => setIsCreating(false)} className="text-muted-foreground text-sm hover:underline">Cancel</button>
              </div>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-40 blur-[1px] pointer-events-none select-none">
                  <div>
                    <label className="block text-xs font-bold mb-1">State</label>
                    <input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} type="text" placeholder="e.g. Lagos" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-primary" disabled />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">City</label>
                    <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} type="text" placeholder="e.g. Ikeja" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-primary" disabled />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold mb-1">Address</label>
                    <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} type="text" placeholder="Full address" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-primary" disabled />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold mb-1">Google Map Location Link</label>
                    <input value={formData.mapLocation} onChange={e => setFormData({ ...formData, mapLocation: e.target.value })} type="url" placeholder="https://maps.google.com/..." className="w-full p-2 rounded border border-border text-sm outline-none focus:border-primary" disabled />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="isActive" 
                      checked={formData.isActive} 
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <label htmlFor="isActive" className="text-sm font-bold cursor-pointer">Active (Enable Shipping for this Area)</label>
                  </div>
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-sm font-bold mb-3">Shipping Prices by Size (₦)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {['extra-large', 'large', 'medium', 'small', 'extra-small'].map((size) => (
                      <div key={size}>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-muted-foreground">{size}</label>
                        <input required value={prices[size as keyof typeof prices]} onChange={e => setPrices({ ...prices, [size]: e.target.value })} type="number" min="0" placeholder="0" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-primary font-bold" />
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-md font-bold disabled:opacity-50 mt-4">
                  {loading ? 'Creating...' : 'Create Area & Save Prices'}
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {areas.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                  No distribution areas created yet.
                </div>
              ) : (
                areas.map(area => (
                  <div key={area.id} className="group bg-card border border-border rounded-lg p-4 shadow-sm relative overflow-hidden flex flex-col">
                    <div className="absolute top-2 right-2 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditArea(area)}
                        className="bg-primary/10 text-primary p-2 rounded-md hover:bg-primary hover:text-white transition-colors"
                        title="Edit Area"
                      >
                        <FaEdit size={12} />
                      </button>
                      <button
                        onClick={() => setPasswordPrompt({ isOpen: true, action: 'delete', targetId: area.id })}
                        className="bg-red-500/10 text-red-500 p-2 rounded-md hover:bg-red-500 hover:text-white transition-colors"
                        title="Delete Area"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>

                    <div className="mb-3 pr-8">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs font-bold text-primary uppercase">{area.city}, {area.state}</h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${area.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {area.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{area.address}</p>
                    </div>

                    <div className="mt-auto pt-3 border-t border-border grid grid-cols-2 gap-2">
                      {Object.entries(area.prices).map(([size, price]) => (
                        <div key={size} className="flex justify-start gap-2 items-center text-xs">
                          <span className="text-muted-foreground capitalize">{size.replace('-', ' ')}</span>
                          <span className="font-bold">₦{price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* Edit Area Overlay */}
      {editingArea && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-xl p-6 shadow-2xl border border-border animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2"><FaEdit className="text-primary" /> Edit Area</h3>
              <button onClick={() => setEditingArea(null)} className="text-muted-foreground hover:text-foreground"><FaTimes size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">State</label>
                  <input required value={editFormData.state} onChange={e => setEditFormData({ ...editFormData, state: e.target.value })} type="text" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">City</label>
                  <input required value={editFormData.city} onChange={e => setEditFormData({ ...editFormData, city: e.target.value })} type="text" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-primary" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold mb-1">Address</label>
                  <input required value={editFormData.address} onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} type="text" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-primary" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold mb-1">Google Map Location Link</label>
                  <input value={editFormData.mapLocation} onChange={e => setEditFormData({ ...editFormData, mapLocation: e.target.value })} type="url" placeholder="https://maps.google.com/..." className="w-full p-2 rounded border border-border text-sm outline-none focus:border-primary" />
                </div>
                <div className="md:col-span-2 flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="editIsActive" 
                    checked={editFormData.isActive} 
                    onChange={e => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="w-4 h-4 accent-primary"
                  />
                  <label htmlFor="editIsActive" className="text-sm font-bold cursor-pointer">Active (Enable Shipping for this Area)</label>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-bold mb-3">Shipping Prices by Size (₦)</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['extra-large', 'large', 'medium', 'small', 'extra-small'].map((size) => (
                    <div key={size}>
                      <label className="block text-[10px] font-bold mb-1 uppercase text-muted-foreground">{size}</label>
                      <input required value={editPrices[size as keyof typeof editPrices]} onChange={e => setEditPrices({ ...editPrices, [size]: e.target.value })} type="number" min="0" placeholder="0" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-primary font-bold" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingArea(null)} className="flex-1 p-3 rounded-lg border border-border font-bold text-sm hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 p-3 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Prompt Modal */}
      {passwordPrompt.isOpen && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-xl p-6 shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaLock size={20} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">CEO Authorization</h3>
            <p className="text-sm text-center text-muted-foreground mb-6">
              Please enter the CEO passkey to {passwordPrompt.action} this area.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter passkey..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg border border-border bg-background mb-4 text-center tracking-widest font-bold focus:border-red-500 outline-none transition-colors"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setPasswordPrompt({ isOpen: false, action: 'create' }); setPassword(''); }} className="flex-1 p-3 rounded-lg border border-border font-bold text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isVerifying} className={`flex-1 p-3 rounded-lg bg-red-600 text-white font-bold text-sm transition-colors ${isVerifying ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'}`}>
                  {isVerifying ? 'Verifying...' : 'Authorize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
