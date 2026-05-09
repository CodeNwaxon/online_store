'use client';

import { useState, useEffect } from 'react';
import { FaPaperPlane, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { toast, Toaster } from 'react-hot-toast';

export default function Contact() {
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
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
    if (user) {
      setLoading(true);
      try {
        await addDoc(collection(db, 'compliants'), {
          userId: user.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          createdAt: new Date()
        });
        setSubmitted(true);
        setFormData({ name: '', email: user.email || '', phone: '', message: '' });
      } catch (error) {
        toast.error('Failed to send message.');
      } finally {
        setLoading(false);
      }
    } else {
      // Non-auth users mock success
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
    }
  };

  return (
    <div className="py-16 max-md:py-8">
      <Toaster position="top-center" />
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl max-md:text-3xl font-bold mb-4">Get In Touch</h1>
          <p className="text-muted-foreground max-w-[600px] mx-auto leading-relaxed">
            Have questions about our products or installment plans? We are here to help. Send us a message and we'll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-md:gap-8">
          {/* Contact Info */}
          <div>
            <h2 className="text-2xl font-bold mb-8">Contact Information</h2>
            <div className="flex flex-col gap-8">
              <div className="flex gap-3">
                <div className="w-[50px] h-[50px] rounded-full bg-muted flex items-center justify-center text-primary shrink-0">
                  <FaPhone size={22} />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Phone</h4>
                  <p className="text-muted-foreground"><span className='text-xs font-semibold text-gray-400'>Head Office:</span> +234 800 123 4567</p>
                  <p className="text-muted-foreground"><span className='text-xs font-semibold text-gray-400'>Sagamu Branch:</span> +234 800 999 8888</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-[50px] h-[50px] rounded-full bg-muted flex items-center justify-center text-primary shrink-0">
                  <FaEnvelope size={22} />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Email</h4>
                  <p className="text-muted-foreground">hello@onlinestore.com</p>
                  <p className="text-muted-foreground">support@onlinestore.com</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-[50px] h-[50px] rounded-full bg-muted flex items-center justify-center text-primary shrink-0">
                  <FaMapMarkerAlt size={22} />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Our Office</h4>
                  <p className="text-muted-foreground">123 Commerce Avenue, Ikeja</p>
                  <p className="text-muted-foreground">Lagos, Nigeria</p>
                </div>
              </div>
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
                    <label htmlFor="name" className="block mb-2 font-semibold text-sm">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your Name"
                      className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block mb-2 font-semibold text-sm">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block mb-2 font-semibold text-sm">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+234 ..."
                      className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block mb-2 font-semibold text-sm">Message</label>
                    <textarea
                      id="message"
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help you?"
                      rows={5}
                      className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors resize-y"
                    ></textarea>
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-primary hover:bg-primary-hover text-white p-4 flex items-center justify-center gap-2 rounded-md font-semibold transition-colors mt-2 disabled:opacity-70 disabled:cursor-not-allowed">
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
