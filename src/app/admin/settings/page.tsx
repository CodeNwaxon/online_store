'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaSave, FaPlus, FaTrash, FaPhone, FaEnvelope, FaMapMarkerAlt, FaShareAlt } from 'react-icons/fa';

const SOCIAL_PLATFORMS = [
  { name: 'WhatsApp', icon: 'FaWhatsapp', placeholder: 'https://wa.me/234...' },
  { name: 'Instagram', icon: 'FaInstagram', placeholder: 'https://instagram.com/...' },
  { name: 'Facebook', icon: 'FaFacebook', placeholder: 'https://facebook.com/...' },
  { name: 'Twitter', icon: 'FaTwitter', placeholder: 'https://twitter.com/...' },
];

export default function AdminSettings() {
  const [siteName, setSiteName] = useState('Quick Choice');
  const [footerMessage, setFooterMessage] = useState('');

  const [phones, setPhones] = useState<{ position: string, number: string }[]>([]);
  const [emails, setEmails] = useState<{ position: string, email: string }[]>([]);
  const [addresses, setAddresses] = useState<{ office: string, address: string }[]>([]);
  const [socialLinks, setSocialLinks] = useState<{ platform: string, url: string }[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSiteName(data.siteName || 'Quick Choice');
        setFooterMessage(data.footerMessage || '');
        setPhones(data.phones || []);
        setEmails(data.emails || []);
        setAddresses(data.addresses || []);
        setSocialLinks(data.socialLinks || []);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        siteName,
        footerMessage,
        phones,
        emails,
        addresses,
        socialLinks
      }, { merge: true });
      toast.success('Settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings.');
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-12 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 px-4 md:px-0">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold">Site Settings</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Global configuration for your online store.</p>
        </div>
        <button onClick={handleSave} className="w-full md:w-auto bg-primary text-sm md:text-base text-white px-8 py-3 rounded-md font-bold flex items-center justify-center gap-2 shadow-lg">
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
          </div>
        </div>
      </section>

      {/* CONTACTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* PHONES */}
        <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2"><FaPhone className="text-primary" /> Phone Numbers</h2>
            <button onClick={() => setPhones([...phones, { position: '', number: '' }])} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
              <FaPlus />
            </button>
          </div>
          <div className="space-y-4">
            {phones.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder="Position (e.g. CEO)"
                  className="flex-1 p-2 rounded border border-border bg-background text-sm"
                  value={item.position}
                  onChange={(e) => {
                    const newItems = [...phones];
                    newItems[i].position = e.target.value;
                    setPhones(newItems);
                  }}
                />
                <input
                  placeholder="Number"
                  className="flex-1 p-2 rounded border border-border bg-background text-sm"
                  value={item.number}
                  onChange={(e) => {
                    const newItems = [...phones];
                    newItems[i].number = e.target.value;
                    setPhones(newItems);
                  }}
                />
                <button onClick={() => setPhones(phones.filter((_, idx) => idx !== i))} className="text-secondary p-2">
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* EMAILS */}
        <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2"><FaEnvelope className="text-primary" /> Email Addresses</h2>
            <button onClick={() => setEmails([...emails, { position: '', email: '' }])} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
              <FaPlus />
            </button>
          </div>
          <div className="space-y-4">
            {emails.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder="Position"
                  className="flex-1 p-2 rounded border border-border bg-background text-sm"
                  value={item.position}
                  onChange={(e) => {
                    const newItems = [...emails];
                    newItems[i].position = e.target.value;
                    setEmails(newItems);
                  }}
                />
                <input
                  placeholder="Email"
                  className="flex-1 p-2 rounded border border-border bg-background text-sm"
                  value={item.email}
                  onChange={(e) => {
                    const newItems = [...emails];
                    newItems[i].email = e.target.value;
                    setEmails(newItems);
                  }}
                />
                <button onClick={() => setEmails(emails.filter((_, idx) => idx !== i))} className="text-secondary p-2">
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ADDRESSES */}
      <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-base md:text-lg font-bold flex items-center gap-2"><FaMapMarkerAlt className="text-primary" /> Business Addresses</h2>
          <button onClick={() => setAddresses([...addresses, { office: '', address: '' }])} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
            <FaPlus />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((item, i) => (
            <div key={i} className="p-4 border border-border rounded-md bg-muted/30 relative">
              <button onClick={() => setAddresses(addresses.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-secondary">
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
      <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
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
            <div key={i} className="flex gap-2 items-center p-3 bg-muted/50 rounded-md">
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
    </div>
  );
}
