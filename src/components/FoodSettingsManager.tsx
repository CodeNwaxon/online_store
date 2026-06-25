'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaTimes, FaPlus, FaTrash, FaMapMarkerAlt, FaLock, FaEdit, FaWhatsapp, FaCog, FaHome, FaImage } from 'react-icons/fa';
import { uploadImageToCloudinary } from '@/actions/upload';
import Image from 'next/image';

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

interface FoodSettingsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FoodSettingsManager({ isOpen, onClose }: FoodSettingsManagerProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  
  // Forms state
  const [formData, setFormData] = useState({ state: '', city: '', address: '', mapLocation: '', isActive: true });
  const [prices, setPrices] = useState({ 'extra-large': '', 'large': '', 'medium': '', 'small': '', 'extra-small': '' });
  
  const [editFormData, setEditFormData] = useState({ state: '', city: '', address: '', mapLocation: '', isActive: true });
  const [editPrices, setEditPrices] = useState({ 'extra-large': '', 'large': '', 'medium': '', 'small': '', 'extra-small': '' });
  
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // WhatsApp State
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');

  // Password protection state
  type ActionType = 'create_area' | 'delete_area' | 'save_whatsapp' | 'save_section';
  const [passwordPrompt, setPasswordPrompt] = useState<{ isOpen: boolean, action: ActionType, targetId?: string }>({ isOpen: false, action: 'create_area' });
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Home Page Section State
  const [sectionImage, setSectionImage] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  const [sectionImageFile, setSectionImageFile] = useState<File | null>(null);
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Fetch Areas and Settings
  useEffect(() => {
    if (!isOpen) return;

    // Fetch Areas
    const unsubAreas = onSnapshot(collection(db, 'food_distribution_areas'), (snap) => {
      const fetchedAreas = snap.docs.map(d => ({ id: d.id, ...d.data() } as Area));
      setAreas(fetchedAreas);
    });

    // Fetch Settings
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'food_market'));
        if (docSnap.exists()) {
          setWhatsappNumber(docSnap.data()?.whatsappNumber || '');
          setSectionImage(docSnap.data()?.sectionImage || '');
          setSectionTitle(docSnap.data()?.sectionTitle || '');
          setSectionDescription(docSnap.data()?.sectionDescription || '');
        }
      } catch (err) {
        console.error("Failed to fetch food market settings", err);
      }
    };
    fetchSettings();

    return () => unsubAreas();
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const currentPasskey = settingsDoc.data()?.passkey || 'admin1234';
      
      if (password === currentPasskey) {
        if (passwordPrompt.action === 'create_area') {
          setIsCreating(true);
        } else if (passwordPrompt.action === 'delete_area' && passwordPrompt.targetId) {
          await handleDelete(passwordPrompt.targetId);
        } else if (passwordPrompt.action === 'save_whatsapp') {
          await saveWhatsappNumber();
        } else if (passwordPrompt.action === 'save_section') {
          await saveSectionSettings();
        }
        setPasswordPrompt({ isOpen: false, action: 'create_area' });
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

  const formatNigerianNumber = (raw: string): string => {
    let num = raw.trim();
    // If starts with 0, replace with 234
    if (num.startsWith('0')) {
      num = '234' + num.slice(1);
    }
    // If starts with 234 (no +), add +
    if (num.startsWith('234') && !num.startsWith('+')) {
      num = '+' + num;
    }
    // If starts with +234 leave as is
    return num;
  };

  const validateWhatsappNumber = (num: string): string => {
    const formatted = formatNigerianNumber(num);
    const digitsOnly = formatted.replace(/\D/g, '');
    if (digitsOnly.length < 13) return 'Phone number is too short. Expected format: +2348012345678';
    if (digitsOnly.length > 13) return 'Phone number is too long. Expected format: +2348012345678';
    if (!digitsOnly.startsWith('234')) return 'Please enter a valid Nigerian phone number.';
    return '';
  };

  const saveWhatsappNumber = async () => {
    setIsSavingWhatsapp(true);
    try {
      const formatted = formatNigerianNumber(whatsappNumber);
      const digitsOnly = formatted.replace(/\D/g, '');
      await setDoc(doc(db, 'settings', 'food_market'), {
        whatsappNumber: digitsOnly,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setWhatsappNumber(formatted);
      setWhatsappError('');
      toast.success('WhatsApp number saved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save WhatsApp number');
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  const saveSectionSettings = async () => {
    setIsSavingSection(true);
    try {
      let finalImageUrl = sectionImage.trim();

      if (sectionImageFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('file', sectionImageFile);
        const result = await uploadImageToCloudinary(formData);
        if (result.url) {
          finalImageUrl = result.url;
        } else {
          toast.error('Image upload failed');
          setIsUploadingImage(false);
          setIsSavingSection(false);
          return;
        }
        setIsUploadingImage(false);
      }

      await setDoc(doc(db, 'settings', 'food_market'), {
        sectionImage: finalImageUrl,
        sectionTitle: sectionTitle.trim(),
        sectionDescription: sectionDescription.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setSectionImage(finalImageUrl);
      setSectionImageFile(null);
      toast.success('Home page section updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save section settings');
    } finally {
      setIsSavingSection(false);
      setIsUploadingImage(false);
    }
  };

  const handleSectionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSectionImageFile(file);
    setSectionImage(URL.createObjectURL(file));
  };

  const handleCreateArea = async (e: React.FormEvent) => {
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

      await addDoc(collection(db, 'food_distribution_areas'), newArea);
      toast.success('Food Area created successfully!');
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
      await deleteDoc(doc(db, 'food_distribution_areas', id));
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
      await updateDoc(doc(db, 'food_distribution_areas', editingArea.id), {
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

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex flex-col md:flex-row p-1 md:p-8 items-center justify-center">
      <div className="bg-background rounded md:rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl">

        {/* Header */}
        <div className="relative flex flex-col md:flex-row gap-3 md:justify-between md:items-center px-2 py-4 md:p-6 border-b border-border bg-card">
          <h2 className="text-xl font-bold flex items-center gap-2 text-green-700">
            <FaCog /> Food Market Settings
          </h2>
          <button onClick={onClose} className="absolute top-4 right-2 md:static text-muted-foreground hover:text-foreground">
            <FaTimes size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto md:p-6 p-4 bg-muted/30 space-y-8">
          
          {/* WhatsApp Section */}
          {!isCreating && (
            <div className="bg-card p-6 rounded-lg border border-green-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <FaWhatsapp size={80} />
              </div>
              <h3 className="font-bold text-lg text-green-800 flex items-center gap-2 mb-4">
                <FaWhatsapp /> WhatsApp Contact
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                This phone number will be used for all "Order via WhatsApp" buttons on the Food Market details page.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="text"
                  placeholder="e.g. 08023451627 or +2348012345678"
                  value={whatsappNumber}
                  onChange={(e) => { setWhatsappNumber(e.target.value); setWhatsappError(''); }}
                  className={`flex-1 p-3 rounded border bg-background focus:border-green-500 outline-none ${whatsappError ? 'border-red-400' : 'border-border'}`}
                />
              </div>
              {whatsappError && (
                <p className="text-red-500 text-xs font-bold mt-2">⚠️ {whatsappError}</p>
              )}
              <div className="mt-3">
                <button
                  type="button"
                  disabled={isSavingWhatsapp}
                  onClick={() => {
                    const error = validateWhatsappNumber(whatsappNumber);
                    if (error) {
                      setWhatsappError(error);
                      return;
                    }
                    setWhatsappError('');
                    setPasswordPrompt({ isOpen: true, action: 'save_whatsapp' });
                  }}
                  className="bg-green-600 text-white px-6 py-3 rounded font-bold hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <FaLock size={12} /> {isSavingWhatsapp ? 'Saving...' : 'Save Number'}
                </button>
              </div>
            </div>
          )}

          {/* Home Page Section Editor */}
          {!isCreating && (
            <div className="bg-card p-6 rounded-lg border border-green-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <FaHome size={80} />
              </div>
              <h3 className="font-bold text-lg text-green-800 flex items-center gap-2 mb-4">
                <FaHome /> Home Page Food Section
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customize the food market promotional section that appears on the home page.
              </p>

              <div className="space-y-4">
                {/* Image Upload / URL */}
                <div>
                  <label className="block text-xs font-bold mb-2">Section Image</label>
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Paste image URL here"
                      value={sectionImage}
                      onChange={(e) => { setSectionImage(e.target.value); setSectionImageFile(null); }}
                      className="w-full p-3 rounded border border-border bg-background focus:border-green-500 outline-none text-sm"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-bold uppercase">Or Upload:</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleSectionImageUpload} 
                        disabled={isUploadingImage}
                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer disabled:opacity-50"
                      />
                      {isUploadingImage && <span className="text-xs text-green-600 animate-pulse font-bold">Uploading...</span>}
                    </div>
                  </div>
                  {sectionImage && (
                    <div className="mt-3 relative w-full h-40 rounded-lg overflow-hidden border border-border bg-muted">
                      <img 
                        src={sectionImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        onError={(e) => (e.currentTarget.style.opacity = '0')} 
                        onLoad={(e) => (e.currentTarget.style.opacity = '1')} 
                      />
                      <button onClick={() => { setSectionImage(''); setSectionImageFile(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors" title="Remove image">
                        <FaTimes size={10} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold mb-1">Section Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Fresh From the Farm to Your Table"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    className="w-full p-3 rounded border border-border bg-background focus:border-green-500 outline-none text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold mb-1">Section Description</label>
                  <textarea
                    rows={3}
                    placeholder="Write a compelling description for the food section..."
                    value={sectionDescription}
                    onChange={(e) => setSectionDescription(e.target.value)}
                    className="w-full p-3 rounded border border-border bg-background focus:border-green-500 outline-none text-sm resize-none"
                  />
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  disabled={isSavingSection}
                  onClick={() => setPasswordPrompt({ isOpen: true, action: 'save_section' })}
                  className="bg-green-600 text-white px-6 py-3 rounded font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FaLock size={12} /> {isSavingSection ? 'Saving...' : 'Save Section Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Distribution Areas Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-green-800 flex items-center gap-2">
                <FaMapMarkerAlt /> Shipping & Distribution Areas
              </h3>
              {!isCreating && (
                <button
                  onClick={() => setPasswordPrompt({ isOpen: true, action: 'create_area' })}
                  className="bg-green-600 text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-green-700 transition-colors"
                >
                  <FaPlus size={12} /> Create New Area
                </button>
              )}
            </div>

            {isCreating ? (
              <div className="bg-card p-6 rounded-lg border border-green-200 shadow-sm animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-base">Create New Area</h4>
                  <button onClick={() => setIsCreating(false)} className="text-muted-foreground text-sm hover:underline">Cancel</button>
                </div>
                <form onSubmit={handleCreateArea} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-40 blur-[1px] pointer-events-none select-none">
                    <div>
                      <label className="block text-xs font-bold mb-1">State</label>
                      <input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} type="text" placeholder="e.g. Lagos" className="w-full p-2 rounded border border-border text-sm outline-none" disabled />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">City</label>
                      <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} type="text" placeholder="e.g. Ikeja" className="w-full p-2 rounded border border-border text-sm outline-none" disabled />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold mb-1">Address</label>
                      <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} type="text" placeholder="Full address" className="w-full p-2 rounded border border-border text-sm outline-none" disabled />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold mb-1">Google Map Location Link</label>
                      <input value={formData.mapLocation} onChange={e => setFormData({ ...formData, mapLocation: e.target.value })} type="url" placeholder="https://maps.google.com/..." className="w-full p-2 rounded border border-border text-sm outline-none" disabled />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2 mt-2">
                      <input 
                        type="checkbox" 
                        id="isActive" 
                        checked={formData.isActive} 
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 accent-green-600"
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
                          <input required value={prices[size as keyof typeof prices]} onChange={e => setPrices({ ...prices, [size]: e.target.value })} type="number" min="0" placeholder="0" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-green-500 font-bold" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-md font-bold hover:bg-green-700 transition-colors disabled:opacity-50 mt-4">
                    {loading ? 'Creating...' : 'Create Area & Save Prices'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {areas.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-muted-foreground text-sm bg-card border border-border rounded-lg border-dashed">
                    No distribution areas created yet.
                  </div>
                ) : (
                  areas.map(area => (
                    <div key={area.id} className="group bg-card border border-border rounded-lg p-4 shadow-sm relative overflow-hidden flex flex-col">
                      <div className="absolute top-2 right-2 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditArea(area)}
                          className="bg-green-100 text-green-700 p-2 rounded-md hover:bg-green-600 hover:text-white transition-colors"
                          title="Edit Area"
                        >
                          <FaEdit size={12} />
                        </button>
                        <button
                          onClick={() => setPasswordPrompt({ isOpen: true, action: 'delete_area', targetId: area.id })}
                          className="bg-red-500/10 text-red-500 p-2 rounded-md hover:bg-red-500 hover:text-white transition-colors"
                          title="Delete Area"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>

                      <div className="mb-3 pr-8">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs font-bold text-green-700 uppercase">{area.city}, {area.state}</h4>
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

      </div>

      {/* Edit Area Overlay */}
      {editingArea && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-xl p-6 shadow-2xl border border-border animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2"><FaEdit className="text-green-600" /> Edit Area</h3>
              <button onClick={() => setEditingArea(null)} className="text-muted-foreground hover:text-foreground"><FaTimes size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">State</label>
                  <input required value={editFormData.state} onChange={e => setEditFormData({ ...editFormData, state: e.target.value })} type="text" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">City</label>
                  <input required value={editFormData.city} onChange={e => setEditFormData({ ...editFormData, city: e.target.value })} type="text" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-green-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold mb-1">Address</label>
                  <input required value={editFormData.address} onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} type="text" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-green-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold mb-1">Google Map Location Link</label>
                  <input value={editFormData.mapLocation} onChange={e => setEditFormData({ ...editFormData, mapLocation: e.target.value })} type="url" placeholder="https://maps.google.com/..." className="w-full p-2 rounded border border-border text-sm outline-none focus:border-green-500" />
                </div>
                <div className="md:col-span-2 flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="editIsActive" 
                    checked={editFormData.isActive} 
                    onChange={e => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="w-4 h-4 accent-green-600"
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
                      <input required value={editPrices[size as keyof typeof editPrices]} onChange={e => setEditPrices({ ...editPrices, [size]: e.target.value })} type="number" min="0" placeholder="0" className="w-full p-2 rounded border border-border text-sm outline-none focus:border-green-500 font-bold" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingArea(null)} className="flex-1 p-3 rounded-lg border border-border font-bold text-sm hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 p-3 rounded-lg bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50">
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Prompt Modal */}
      {passwordPrompt.isOpen && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-xl p-6 shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaLock size={20} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">CEO Authorization</h3>
            <p className="text-sm text-center text-muted-foreground mb-6">
              Please enter the CEO passkey to authorize this action.
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
                <button type="button" onClick={() => { setPasswordPrompt({ isOpen: false, action: 'create_area' }); setPassword(''); }} className="flex-1 p-3 rounded-lg border border-border font-bold text-sm hover:bg-muted transition-colors">
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
