'use client';

import { useState } from 'react';
import { FaPaperPlane, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Get In Touch</h1>
          <p style={{ color: 'var(--muted-foreground)', maxWidth: '600px', margin: '0 auto' }}>
            Have questions about our products or installment plans? We are here to help. Send us a message and we'll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid grid-2" style={{ gap: '4rem' }}>
          {/* Contact Info */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem' }}>Contact Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ 
                  width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--muted)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' 
                }}>
                  <FaPhone size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Phone</h4>
                  <p style={{ color: 'var(--muted-foreground)' }}>+234 800 123 4567</p>
                  <p style={{ color: 'var(--muted-foreground)' }}>+234 800 999 8888</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ 
                  width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--muted)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' 
                }}>
                  <FaEnvelope size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Email</h4>
                  <p style={{ color: 'var(--muted-foreground)' }}>hello@onlinestore.com</p>
                  <p style={{ color: 'var(--muted-foreground)' }}>support@onlinestore.com</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ 
                  width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--muted)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' 
                }}>
                  <FaMapMarkerAlt size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Our Office</h4>
                  <p style={{ color: 'var(--muted-foreground)' }}>123 Commerce Avenue, Ikeja</p>
                  <p style={{ color: 'var(--muted-foreground)' }}>Lagos, Nigeria</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div style={{ backgroundColor: 'var(--card)', padding: '2.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#DEF7EC', color: '#03543F', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' 
                }}>
                  <FaPaperPlane size={40} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Message Sent!</h3>
                <p style={{ color: 'var(--muted-foreground)' }}>Thank you for reaching out. We will get back to you shortly.</p>
                <button 
                  className="btn btn-outline" 
                  style={{ marginTop: '2rem' }}
                  onClick={() => setSubmitted(false)}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Full Name</label>
                    <input 
                      type="text" 
                      id="name" 
                      required 
                      placeholder="Your Name"
                      style={{ 
                        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', 
                        border: '1px solid var(--border)', backgroundColor: 'var(--background)' 
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Email Address</label>
                    <input 
                      type="email" 
                      id="email" 
                      required 
                      placeholder="email@example.com"
                      style={{ 
                        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', 
                        border: '1px solid var(--border)', backgroundColor: 'var(--background)' 
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Phone Number</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      required 
                      placeholder="+234 ..."
                      style={{ 
                        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', 
                        border: '1px solid var(--border)', backgroundColor: 'var(--background)' 
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="message" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Message</label>
                    <textarea 
                      id="message" 
                      required 
                      placeholder="How can we help you?"
                      rows={5}
                      style={{ 
                        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', 
                        border: '1px solid var(--border)', backgroundColor: 'var(--background)',
                        resize: 'vertical'
                      }}
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
                    Send Message <FaPaperPlane size={18} />
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
