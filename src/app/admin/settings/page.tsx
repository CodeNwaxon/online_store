'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaSave, FaPlus, FaTrash, FaPhone, FaEnvelope, FaMapMarkerAlt, FaShareAlt, FaImage, FaTimes, FaLink, FaShieldAlt, FaLock, FaUndo } from 'react-icons/fa';
import { uploadImageToCloudinary } from '@/actions/upload';

const SOCIAL_PLATFORMS = [
  { name: 'WhatsApp', icon: 'FaWhatsapp', placeholder: 'https://wa.me/234...' },
  { name: 'Instagram', icon: 'FaInstagram', placeholder: 'https://instagram.com/...' },
  { name: 'Facebook', icon: 'FaFacebook', placeholder: 'https://facebook.com/...' },
  { name: 'Twitter', icon: 'FaTwitter', placeholder: 'https://twitter.com/...' },
];

export default function AdminSettings() {
  const [siteName, setSiteName] = useState('');
  const [footerMessage, setFooterMessage] = useState('');
  const [installmentBg, setInstallmentBg] = useState('');
  const [installmentBgUrlInput, setInstallmentBgUrlInput] = useState('');
  const [installmentBgUploading, setInstallmentBgUploading] = useState(false);

  const [phones, setPhones] = useState<{ position: string, number: string }[]>([]);
  const [emails, setEmails] = useState<{ position: string, email: string }[]>([]);
  const [addresses, setAddresses] = useState<{ office: string, address: string }[]>([]);
  const [socialLinks, setSocialLinks] = useState<{ platform: string, url: string }[]>([]);
  const [warrantyPolicy, setWarrantyPolicy] = useState('');

  // Market Categories Explorer
  const [categoriesExplorer, setCategoriesExplorer] = useState({
    toiletKitchen: { description: 'Upgrade your home with our high-quality kitchenware and bathroom essentials designed for modern living.', image: '' },
    cosmetics: { description: 'Discover our collection of premium beauty products, skincare routines, and authentic cosmetics.', image: '' },
    wears: { description: 'Step out in style with our latest fashion collection featuring trendy clothes and elegant accessories.', image: '' },
  });
  
  const [ceUrlInputs, setCeUrlInputs] = useState({ toiletKitchen: '', cosmetics: '', wears: '' });
  const [ceUploading, setCeUploading] = useState({ toiletKitchen: false, cosmetics: false, wears: false });

  // Track original data for dirty save (excluding warranty)
  const [originalData, setOriginalData] = useState<any>(null);

  // Passkey Overlay State
  const [showPasskeyOverlay, setShowPasskeyOverlay] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [isSavingWarranty, setIsSavingWarranty] = useState(false);

  const DEFAULT_WARRANTY_POLICY = `Please note:
1. Warranty does NOT cover self-inflicted or accidental damages (e.g., screen breaks, liquid spills, or physical impact).
2. Warranties are provided directly by the manufacturing companies, not by our store.
3. If a product requires service, we will facilitate sending it to the manufacturer. This process may take some time for repairs and return.
4. Returns/Exchanges: If a product is found to have a manufacturing defect within 2 days of purchase, it can be exchanged, provided it is in the exact condition it was purchased (including original packaging and accessories).`;


  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSiteName(data.siteName || '');
        setFooterMessage(data.footerMessage || '');
        setInstallmentBg(data.installmentBg || '');
        setPhones(data.phones || []);
        setEmails(data.emails || []);
        setAddresses(data.addresses || []);
        setSocialLinks(data.socialLinks || []);
        setWarrantyPolicy(data.warrantyPolicy || DEFAULT_WARRANTY_POLICY);
        if (data.categoriesExplorer) {
          setCategoriesExplorer({
            toiletKitchen: data.categoriesExplorer.toiletKitchen || { description: 'Upgrade your home with our high-quality kitchenware and bathroom essentials designed for modern living.', image: '' },
            cosmetics: data.categoriesExplorer.cosmetics || { description: 'Discover our collection of premium beauty products, skincare routines, and authentic cosmetics.', image: '' },
            wears: data.categoriesExplorer.wears || { description: 'Step out in style with our latest fashion collection featuring trendy clothes and elegant accessories.', image: '' },
          });
        }

        // Store snapshot for dirty check
        setOriginalData(data);
      }
    };
    fetchSettings();
  }, []);

  // Dirty state calculation
  const isDirty = JSON.stringify({
    siteName,
    footerMessage,
    installmentBg,
    phones,
    emails,
    addresses,
    socialLinks,
    categoriesExplorer
  }) !== JSON.stringify({
    siteName: originalData?.siteName || '',
    footerMessage: originalData?.footerMessage || '',
    installmentBg: originalData?.installmentBg || '',
    phones: originalData?.phones || [],
    emails: originalData?.emails || [],
    addresses: originalData?.addresses || [],
    socialLinks: originalData?.socialLinks || [],
    categoriesExplorer: originalData?.categoriesExplorer || {
      toiletKitchen: { description: 'Upgrade your home with our high-quality kitchenware and bathroom essentials designed for modern living.', image: '' },
      cosmetics: { description: 'Discover our collection of premium beauty products, skincare routines, and authentic cosmetics.', image: '' },
      wears: { description: 'Step out in style with our latest fashion collection featuring trendy clothes and elegant accessories.', image: '' },
    }
  });

  const handleSave = async () => {
    try {
      const updatedData = {
        siteName,
        footerMessage,
        installmentBg,
        phones,
        emails,
        addresses,
        socialLinks,
        categoriesExplorer
      };
      await setDoc(doc(db, 'settings', 'general'), updatedData, { merge: true });

      // Update originalData so the bar disappears
      setOriginalData({ ...originalData, ...updatedData });
      toast.success('Settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings.');
    }
  };

  const handleCancelChanges = () => {
    if (originalData) {
      setSiteName(originalData.siteName || '');
      setFooterMessage(originalData.footerMessage || '');
      setInstallmentBg(originalData.installmentBg || '');
      setPhones(originalData.phones || []);
      setEmails(originalData.emails || []);
      setAddresses(originalData.addresses || []);
      setSocialLinks(originalData.socialLinks || []);
      if (originalData.categoriesExplorer) {
        setCategoriesExplorer(originalData.categoriesExplorer);
      }
      toast('Changes discarded', { icon: '🔄' });
    }
  };

  const handleSaveWarranty = async () => {
    setIsSavingWarranty(true);
    setPasskeyError('');
    try {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      const currentPasskey = docSnap.data()?.passkey || 'admin1234';

      if (passkeyInput !== currentPasskey) {
        setPasskeyError('Incorrect CEO passkey. Access denied.');
        setIsSavingWarranty(false);
        return;
      }

      await setDoc(docRef, {
        warrantyPolicy
      }, { merge: true });

      // Update local original data for warranty specifically
      setOriginalData({ ...originalData, warrantyPolicy });

      toast.success('Warranty policy updated!');
      setShowPasskeyOverlay(false);
      setPasskeyInput('');
    } catch (error) {
      toast.error('Failed to update policy.');
    } finally {
      setIsSavingWarranty(false);
    }
  };


  return (
    <div className="max-w-[1000px] mx-auto space-y-6 md:space-y-12 pb-20 relative">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 px-4 md:px-0">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold">Site Settings</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Global configuration for your online store.</p>
        </div>
        <button onClick={handleSave} className="w-full md:w-auto bg-primary text-sm md:text-base text-white px-8 py-3 rounded-md font-bold flex items-center justify-center gap-2 shadow-lg mt-4 md:mt-0">
          <FaSave /> Save All Changes
        </button>
      </header>

      {/* GENERAL SECTION */}
      <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm space-y-6">
        <h2 className="text-lg md:text-xl font-bold border-b border-border pb-4">General Info</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Site Name</label>
            <input
              type="text"
              className="w-full p-3 rounded-md border border-border bg-background font-semibold text-primary"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Footer Message</label>
            <textarea
              rows={3}
              className="w-full p-3 rounded-md border border-border bg-background"
              value={footerMessage}
              onChange={(e) => setFooterMessage(e.target.value)}
              placeholder="e.g. Premium African-inspired store..."
            />
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Tip: Wrap your company name in square brackets like <code className="bg-muted px-1 rounded">[Your Store Name]</code> to make it bold and primary-colored in the footer.
            </p>
          </div>
        </div>
      </section>

      {/* MARKET CATEGORIES EXPLORER */}
      <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm space-y-6">
        <h2 className="text-lg md:text-xl font-bold border-b border-border pb-4 flex items-center gap-2">
          <FaImage className="text-primary" /> Market Categories Explorer Settings
        </h2>
        <p className="text-xs text-muted-foreground">Manage the 3 category cards shown on the home page (Toilet & Kitchen, Cosmetics, Wears).</p>

        {Object.entries(categoriesExplorer).map(([key, data]) => {
          const categoryKey = key as keyof typeof categoriesExplorer;
          const title = categoryKey === 'toiletKitchen' ? 'Toilet & Kitchen' : categoryKey === 'cosmetics' ? 'Cosmetics' : 'Wears';
          
          return (
            <div key={categoryKey} className="border border-border rounded-md p-4 space-y-4 bg-muted/10">
              <h3 className="font-bold text-md text-primary">{title}</h3>
              
              <div>
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea
                  rows={2}
                  className="w-full p-3 rounded-md border border-border bg-background text-sm"
                  value={data.description}
                  onChange={(e) => setCategoriesExplorer({ ...categoriesExplorer, [categoryKey]: { ...data, description: e.target.value } })}
                />
              </div>

              {/* Preview */}
              <div className="relative w-full h-32 md:h-40 rounded-md overflow-hidden border border-border bg-slate-200">
                {data.image ? (
                  <img
                    src={data.image}
                    alt={`${title} background preview`}
                    className="w-full h-full object-cover opacity-60"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm bg-slate-100 opacity-60">
                    No Image
                  </div>
                )}
                {data.image && (
                  <button
                    type="button"
                    onClick={() => setCategoriesExplorer({ ...categoriesExplorer, [categoryKey]: { ...data, image: '' } })}
                    className="absolute top-2 right-2 bg-secondary text-white p-1.5 rounded-full hover:bg-secondary-hover transition-colors z-10 shadow-md"
                    title="Remove image"
                  >
                    <FaTimes size={12} />
                  </button>
                )}
                <div className="absolute inset-0 flex items-center justify-center font-bold text-xl md:text-2xl text-slate-800 drop-shadow-md z-10">
                  {title} Preview
                </div>
              </div>

              {/* URL Input & Upload row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste image URL..."
                      className="w-full flex-1 p-2 rounded-md border border-border bg-background text-sm"
                      value={ceUrlInputs[categoryKey]}
                      onChange={(e) => setCeUrlInputs({ ...ceUrlInputs, [categoryKey]: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (ceUrlInputs[categoryKey].trim()) {
                          setCategoriesExplorer({ ...categoriesExplorer, [categoryKey]: { ...data, image: ceUrlInputs[categoryKey].trim() } });
                          setCeUrlInputs({ ...ceUrlInputs, [categoryKey]: '' });
                          toast.success('URL applied!');
                        }
                      }}
                      className="bg-muted px-4 py-2 rounded-md border border-border text-sm font-bold hover:bg-muted/80"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Upload Image</label>
                  <label className={`flex items-center justify-center gap-2 p-2 h-[42px] rounded-md border border-dashed cursor-pointer transition-colors ${ceUploading[categoryKey] ? 'border-primary/50 bg-primary/5 opacity-70' : 'border-primary bg-primary/5 hover:bg-primary/10'}`}>
                    <FaImage className="text-primary text-sm" />
                    <span className="text-sm font-bold text-primary">
                      {ceUploading[categoryKey] ? 'Uploading...' : 'Choose File'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={ceUploading[categoryKey]}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setCeUploading({ ...ceUploading, [categoryKey]: true });
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const uploadData = await uploadImageToCloudinary(formData);
                          setCategoriesExplorer({ ...categoriesExplorer, [categoryKey]: { ...data, image: uploadData.secure_url } });
                          toast.success('Image uploaded!');
                        } catch {
                          toast.error('Upload failed. Try URL instead.');
                        } finally {
                          setCeUploading({ ...ceUploading, [categoryKey]: false });
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* INSTALLMENT BACKGROUND IMAGE */}
      <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm space-y-6">
        <h2 className="text-lg md:text-xl font-bold border-b border-border pb-4 flex items-center gap-2">
          <FaImage className="text-primary" /> Installment Background Image
        </h2>
        <p className="text-xs text-muted-foreground">This image appears in the 'Pay in Easy Installments' section on the home page. Defaults to <code className="bg-muted px-1 rounded">/images/environment.jpeg</code> if not set.</p>

        {/* Preview */}
        {(installmentBg || true) && (
          <div className="relative w-full h-40 rounded-md overflow-hidden border border-border bg-muted">
            <img
              src={installmentBg || '/images/environment.jpeg'}
              alt="Installment background preview"
              className="w-full h-full object-cover"
            />
            {installmentBg && (
              <button
                type="button"
                onClick={() => setInstallmentBg('')}
                className="absolute top-2 right-2 bg-secondary text-white p-1.5 rounded-full hover:bg-secondary-hover transition-colors"
                title="Reset to default"
              >
                <FaTimes size={12} />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 text-center">
              {installmentBg ? 'Custom Image' : 'Default: /images/environment.jpeg'}
            </div>
          </div>
        )}

        {/* URL Input */}
        <div>
          <label className="block text-sm font-bold mb-2">Image URL</label>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              placeholder="Paste image URL here..."
              className="w-full md:flex-1 p-3 rounded-md border border-border bg-background text-sm"
              value={installmentBgUrlInput}
              onChange={(e) => setInstallmentBgUrlInput(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                if (installmentBgUrlInput.trim()) {
                  setInstallmentBg(installmentBgUrlInput.trim());
                  setInstallmentBgUrlInput('');
                  toast.success('URL applied!');
                }
              }}
              className="w-full md:w-auto bg-muted px-4 py-3 md:py-2 rounded-md border border-border text-sm font-bold hover:bg-muted/80 flex items-center justify-center gap-2"
            >
              <FaLink /> Apply
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-bold mb-2">Upload File</label>
          <label className={`flex items-center justify-center gap-2 p-4 rounded-md border-2 border-dashed cursor-pointer transition-colors ${installmentBgUploading ? 'border-primary/50 bg-primary/5 opacity-70' : 'border-primary bg-primary/5 hover:bg-primary/10'
            }`}>
            <FaImage className="text-primary" />
            <span className="text-sm font-bold text-primary">
              {installmentBgUploading ? 'Uploading...' : 'Choose Image File'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={installmentBgUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setInstallmentBgUploading(true);
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  const data = await uploadImageToCloudinary(formData);
                  setInstallmentBg(data.secure_url);
                  toast.success('Image uploaded!');
                } catch {
                  toast.error('Upload failed. Try URL instead.');
                } finally {
                  setInstallmentBgUploading(false);
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>
      </section>

      {/* CONTACTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* PHONES */}
        <section className="bg-card py-4 px-2 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2"><FaPhone className="text-primary" /> Phone Numbers</h2>
            <button onClick={() => setPhones([...phones, { position: '', number: '' }])} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
              <FaPlus />
            </button>
          </div>
          <div className="space-y-4">
            {phones.map((item, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-2 md:items-center bg-muted/20 md:bg-transparent p-3 md:p-0 rounded-md border md:border-none border-border">
                <input
                  placeholder="Position (e.g. CEO)"
                  className="w-full md:flex-1 p-2 rounded border border-border bg-background text-sm"
                  value={item.position}
                  onChange={(e) => {
                    const newItems = [...phones];
                    newItems[i].position = e.target.value;
                    setPhones(newItems);
                  }}
                />
                <input
                  placeholder="Number"
                  className="w-full md:flex-1 p-2 rounded border border-border bg-background text-sm"
                  value={item.number}
                  onChange={(e) => {
                    const newItems = [...phones];
                    newItems[i].number = e.target.value;
                    setPhones(newItems);
                  }}
                />
                <button onClick={() => setPhones(phones.filter((_, idx) => idx !== i))} className="self-end md:self-auto text-secondary p-2 bg-secondary/10 md:bg-transparent rounded-md mt-2 md:mt-0">
                  <FaTrash size={14} className="md:w-[14px] w-[12px]" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* EMAILS */}
        <section className="bg-card py-4 px-2 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2"><FaEnvelope className="text-primary" /> Email Addresses</h2>
            <button onClick={() => setEmails([...emails, { position: '', email: '' }])} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
              <FaPlus />
            </button>
          </div>
          <div className="space-y-4">
            {emails.map((item, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-2 md:items-center bg-muted/20 md:bg-transparent p-3 md:p-0 rounded-md border md:border-none border-border">
                <input
                  placeholder="Position"
                  className="w-full md:flex-1 p-2 rounded border border-border bg-background text-sm"
                  value={item.position}
                  onChange={(e) => {
                    const newItems = [...emails];
                    newItems[i].position = e.target.value;
                    setEmails(newItems);
                  }}
                />
                <input
                  placeholder="Email"
                  className="w-full md:flex-1 p-2 rounded border border-border bg-background text-sm"
                  value={item.email}
                  onChange={(e) => {
                    const newItems = [...emails];
                    newItems[i].email = e.target.value;
                    setEmails(newItems);
                  }}
                />
                <button onClick={() => setEmails(emails.filter((_, idx) => idx !== i))} className="self-end md:self-auto text-secondary p-2 bg-secondary/10 md:bg-transparent rounded-md mt-2 md:mt-0">
                  <FaTrash size={14} className="md:w-[14px] w-[12px]" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ADDRESSES */}
      <section className="bg-card py-4 px-2 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-base md:text-lg font-bold flex items-center gap-2"><FaMapMarkerAlt className="text-primary" /> Business Addresses</h2>
          <button onClick={() => setAddresses([...addresses, { office: '', address: '' }])} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
            <FaPlus />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((item, i) => (
            <div key={i} className="p-4 border border-border rounded-md bg-muted/30 relative">
              <button onClick={() => setAddresses(addresses.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 md:top-2 md:right-2 text-secondary">
                <FaTrash size={14} />
              </button>
              <div className="space-y-3">
                <input
                  placeholder="Office Name (e.g. Lagos Office)"
                  className="w-full p-2 rounded border border-border bg-background text-sm font-bold"
                  value={item.office}
                  onChange={(e) => {
                    const newItems = [...addresses];
                    newItems[i].office = e.target.value;
                    setAddresses(newItems);
                  }}
                />
                <textarea
                  placeholder="Full Address"
                  className="w-full p-2 rounded border border-border bg-background text-sm"
                  value={item.address}
                  onChange={(e) => {
                    const newItems = [...addresses];
                    newItems[i].address = e.target.value;
                    setAddresses(newItems);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SOCIAL LINKS */}
      <section className="bg-card py-4 px-2 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
          <h2 className="text-base md:text-lg font-bold flex items-center gap-2 w-full md:w-auto"><FaShareAlt className="text-primary" /> Social Links</h2>
          <div className="w-full md:w-auto">
            <select
              className="w-full md:w-48 p-2 rounded border border-border bg-background text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  const platform = SOCIAL_PLATFORMS.find(p => p.name === e.target.value);
                  if (platform) {
                    setSocialLinks([...socialLinks, { platform: platform.name, url: platform.placeholder }]);
                  }
                  e.target.value = '';
                }
              }}
            >
              <option value="">Add Social Link...</option>
              {SOCIAL_PLATFORMS.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socialLinks.map((item, i) => (
            <div key={i} className="flex md:gap-2 items-center p-3 bg-muted/50 rounded-md">
              <span className="text-sm font-bold min-w-[80px]">{item.platform}</span>
              <input
                className="flex-1 p-2 rounded border border-border bg-background text-xs"
                value={item.url}
                onChange={(e) => {
                  const newItems = [...socialLinks];
                  newItems[i].url = e.target.value;
                  setSocialLinks(newItems);
                }}
              />
              <button onClick={() => setSocialLinks(socialLinks.filter((_, idx) => idx !== i))} className="text-secondary p-2">
                <FaTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* WARRANTY POLICIES SECTION */}
      <section className="bg-card py-4 px-2 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-border pb-4">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <FaShieldAlt className="text-primary" /> Warranty Policies
          </h2>
          <button
            onClick={() => setShowPasskeyOverlay(true)}
            className="bg-primary text-white px-3 md:px-6 py-2 rounded-md font-bold text-sm shadow-sm hover:opacity-90 transition-opacity"
          >
            Save Policy
          </button>
        </div>
        <p className="text-xs text-muted-foreground italic">
          * Updating these policies requires the CEO passkey.
        </p>
        <textarea
          rows={10}
          className="w-full p-4 rounded-md border border-border bg-background text-sm leading-relaxed"
          value={warrantyPolicy}
          onChange={(e) => setWarrantyPolicy(e.target.value)}
          placeholder="Enter the official store warranty policy here..."
        />
      </section>

      {/* DIRTY SAVE BAR */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[650px] bg-card border border-primary shadow-2xl rounded-2xl md:rounded-full p-4 md:p-2 md:pl-6 flex flex-col md:flex-row gap-3 justify-between items-center z-[500] animate-in fade-in slide-in-from-bottom-4">
          <p className="text-xs md:text-sm font-medium w-full text-center md:text-left">Site settings have unsaved changes</p>
          <div className="flex gap-2 w-full md:w-auto justify-center">
            <button
              onClick={handleCancelChanges}
              className="flex-1 md:flex-none justify-center px-4 md:px-4 py-2 text-xs md:text-sm font-bold text-muted-foreground hover:bg-muted rounded-full transition-colors flex items-center gap-2 border border-border md:border-none"
            >
              <FaUndo size={12} /> Discard
            </button>
            <button
              onClick={handleSave}
              className="flex-1 md:flex-none justify-center px-6 md:px-6 py-2 text-xs md:text-sm font-bold bg-primary text-white rounded-full hover:bg-primary/90 shadow-lg flex items-center gap-2"
            >
              <FaSave size={12} /> Update Now
            </button>
          </div>
        </div>
      )}

      {/* CEO PASSKEY OVERLAY */}
      {showPasskeyOverlay && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaLock className="text-secondary text-2xl" />
            </div>
            <h3 className="font-bold text-xl mb-2">CEO Authorization</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Please enter the CEO passkey to save changes to the warranty policy.
            </p>
            <input
              type="password"
              autoFocus
              placeholder="Enter CEO Passkey"
              className={`w-full p-4 rounded-md border text-center font-bold text-lg mb-2 focus:outline-none transition-colors ${passkeyError ? 'border-red-500 bg-red-50' : 'border-border focus:border-primary'
                }`}
              value={passkeyInput}
              onChange={(e) => {
                setPasskeyInput(e.target.value);
                setPasskeyError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveWarranty()}
            />
            {passkeyError && (
              <p className="text-red-500 text-xs font-bold mb-4 animate-bounce">
                {passkeyError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasskeyOverlay(false);
                  setPasskeyInput('');
                  setPasskeyError('');
                }}
                className="flex-1 py-3 rounded-md border border-border font-bold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWarranty}
                disabled={isSavingWarranty || !passkeyInput}
                className="flex-1 py-3 rounded-md bg-primary text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSavingWarranty ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}