'use client';

import { useState, useEffect } from 'react';
import { FaPaperPlane, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { toast, Toaster } from 'react-hot-toast';

export default function Contact() {
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // State for dynamic settings data
  const [settings, setSettings] = useState<{
    phones: { position: string, number: string }[],
    emails: { position: string, email: string }[],
    addresses: { office: string, address: string }[]
  }>({
    phones: [],
    emails: [],
    addresses: []
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            phones: data.phones || [],
            emails: data.emails || [],
            addresses: data.addresses || []
          });
        }
      } catch (error) {
        console.error("Error fetching contact settings:", error);
      }
    };

    fetchSettings();

    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setFormData(prev => ({
          ...prev,
          email: prev.email || currentUser.email || '',
          name: prev.name || currentUser.displayName || ''
        }));
      }
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'complaints'), {
        userId: user?.uid || 'guest',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        isNew: true,
        createdAt: new Date()
      });
      setSubmitted(true);
      setFormData({ name: '', email: user?.email || '', phone: '', message: '' });
    } catch (error) {
      toast.error('Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 max-md:py-8">
      <Toaster position="top-center" />
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl max-md:text-3xl font-bold mb-4">Get In Touch</h1>
          <p className="text-muted-foreground max-w-[600px] mx-auto leading-relaxed">
            Have questions? We are here to help. Send us a message and we'll get back to you shortly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-md:gap-8">
          {/* Contact Info */}
          <div>
            <h2 className="text-2xl font-bold mb-8">Contact Information</h2>
            <div className="flex flex-col gap-10">

              {/* PHONES with tel: link */}
              {settings.phones.length > 0 && (
                <div className="flex gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-muted flex items-center justify-center text-primary shrink-0">
                    <FaPhone size={22} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="font-bold">Phone Numbers</h4>
                    {settings.phones.map((item, i) => (
                      <a
                        key={i}
                        href={`tel:${item.number}`}
                        className="text-muted-foreground hover:text-primary transition-colors block"
                      >
                        <span className='text-[10px] font-bold text-gray-400 uppercase mr-2'>{item.position}:</span>
                        {item.number}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* EMAILS with mailto: link */}
              {settings.emails.length > 0 && (
                <div className="flex gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-muted flex items-center justify-center text-primary shrink-0">
                    <FaEnvelope size={22} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="font-bold">Email Addresses</h4>
                    {settings.emails.map((item, i) => (
                      <a
                        key={i}
                        href={`mailto:${item.email}`}
                        className="text-muted-foreground hover:text-primary transition-colors block"
                      >
                        <span className='text-[10px] font-bold text-gray-400 uppercase mr-2'>{item.position}:</span>
                        {item.email}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ADDRESSES */}
              {settings.addresses.length > 0 && (
                <div className="flex gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-muted flex items-center justify-center text-primary shrink-0">
                    <FaMapMarkerAlt size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold mb-2">Our Offices</h4>
                    {settings.addresses.map((item, i) => (
                      <div key={i} className="mb-4 last:mb-0">
                        <p className="text-sm font-bold text-primary">{item.office}</p>
                        <p className="text-muted-foreground text-sm whitespace-pre-line">{item.address}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card p-10 max-md:p-6 rounded-[var(--radius)] border border-border shadow-sm">
            {submitted ? (
              <div className="text-center p-8">
                <div className="w-20 h-20 rounded-full bg-[#DEF7EC] text-[#03543F] flex items-center justify-center mx-auto mb-6">
                  <FaPaperPlane size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Message Sent!</h3>
                <p className="text-muted-foreground">Thank you for reaching out. We will get back to you shortly.</p>
                <button
                  className="border border-border text-foreground hover:bg-muted px-6 py-3 rounded-md font-semibold mt-8 transition-colors"
                  onClick={() => setSubmitted(false)}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="block mb-2 font-semibold text-sm">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your Name"
                      className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold text-sm">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold text-sm">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+234 ..."
                      className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold text-sm">Message</label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help you?"
                      rows={5}
                      className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors resize-y"
                    ></textarea>
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-primary hover:bg-primary-hover text-white p-4 flex items-center justify-center gap-2 rounded-md font-semibold transition-colors mt-2 disabled:opacity-70">
                    {loading ? 'Sending...' : 'Send Message'} <FaPaperPlane size={18} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}