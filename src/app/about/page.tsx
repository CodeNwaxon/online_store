'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import { FaEnvelope, FaPhone, FaCheckCircle, FaMapMarkerAlt } from 'react-icons/fa';

export default function About() {
  const [settings, setSettings] = useState<any>(null);
  const [aboutData, setAboutData] = useState<any>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [settingsSnap, aboutSnap] = await Promise.all([
        getDoc(doc(db, 'settings', 'general')),
        getDoc(doc(db, 'settings', 'about'))
      ]);

      if (settingsSnap.exists()) setSettings(settingsSnap.data());
      if (aboutSnap.exists()) setAboutData(aboutSnap.data());
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="py-20 text-center font-bold text-primary animate-pulse">Loading Our Story...</div>;

  const siteName = settings?.siteName || '';
  const ceo = settings?.ceoInfo || {
    name: 'Prince Martins',
    role: 'CEO & Founder',
    email: 'princenwachukwu308@yahoo.com',
    phone: '+234 703 463 2037',
    image: '/images/ceo.jpeg',
    message: `Founded with a vision to bring premium quality goods to every home, ${siteName} combines modern convenience with the vibrant spirit of African design.`
  };

  const primaryAddress = settings?.addresses?.[0] || {
    office: 'Head Office',
    address: '168, Akarigbo Road, Sabo Sagamu, Ogun State'
  };

  const faqs = aboutData?.faqs || [
    { question: 'How long does delivery take?', answer: 'Typically 3-5 business days for major cities.' }
  ];

  const policies = aboutData?.policies || [
    { title: 'Data Collection', content: 'We collect necessary information to process your orders.' }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="py-16 max-md:py-8 bg-primary text-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="max-w-[800px]">
            <h1 className="text-5xl max-md:text-4xl font-bold mb-6">{aboutData?.heroText || 'Our Story'}</h1>
            <p className="text-lg max-md:text-base opacity-90 leading-relaxed">
              {aboutData?.missionStatement || `Founded with a vision to bring premium quality goods to every home, ${siteName} combines modern convenience with the vibrant spirit of African design.`}
            </p>
          </div>
        </div>
      </section>

      {/* CEO & Leadership */}
      <section className="py-16 max-md:py-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[600px] max-md:h-[350px] rounded-[var(--radius)] overflow-hidden border-4 border-primary/20">
              <Image
                src={ceo.image}
                alt={ceo.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="p-8 max-md:p-0">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Message from our Founder</h2>
              <p className="text-muted-foreground mb-6 md:text-lg leading-relaxed italic border-l-4 border-primary pl-6">
                "{ceo.message}"
              </p>
              <div className="font-bold text-2xl">{ceo.name}</div>
              <div className="text-primary font-bold mb-6">CEO & Founder</div>
              <div className="flex flex-col gap-4">
                <a href={`mailto:${ceo.email}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><FaEnvelope /></div>
                  {ceo.email}
                </a>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><FaPhone /></div>
                  {ceo.phone}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Care / Support */}
      <section className="py-16 max-md:py-8 bg-muted">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <h2 className="text-center mb-12 text-3xl font-bold">Contact & Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-[var(--radius)] shadow-sm border border-border">
              <div className="text-primary mb-4"><FaEnvelope size={24} /></div>
              <h3 className="mb-4 font-bold text-xl">Email Support</h3>
              <div className="space-y-2">
                {settings?.emails?.map((e: any, i: number) => (
                  <p key={i} className="text-muted-foreground text-sm"><strong>{e.position}:</strong> <a className="text-blue-700 hover:underline" href={`mailto:${e.email}`} target="_blank" rel="noopener noreferrer">{e.email}</a></p>
                )) || <p className="text-muted-foreground">support@onlinestore.com</p>}
              </div>
            </div>
            <div className="bg-card p-8 rounded-[var(--radius)] shadow-sm border border-border">
              <div className="text-primary mb-4"><FaPhone size={24} /></div>
              <h3 className="mb-4 font-bold text-xl">Phone Support</h3>
              <div className="space-y-2">
                {settings?.phones?.map((p: any, i: number) => (
                  <p key={i} className="text-sm text-muted-foreground"><strong>{p.position}:</strong> <a href={`tel:${p.number}`} target="_blank" rel="noopener noreferrer">{p.number}</a></p>
                )) || <p className="text-muted-foreground">+234 800 999 8888</p>}
              </div>
            </div>
            <div className="bg-card p-8 rounded-[var(--radius)] shadow-sm border border-border">
              <div className="text-primary mb-4"><FaMapMarkerAlt size={24} /></div>
              <h3 className="mb-4 font-bold text-xl">Visit Us</h3>
              <p className="text-muted-foreground text-sm mb-4"><strong>{primaryAddress.office}:</strong> {primaryAddress.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primaryAddress.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-bold hover:underline"
              >
                Get Navigation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 max-md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="w-24 h-1 bg-primary mx-auto mb-8"></div>

            {/* Search Input Box */}
            <div className="max-w-md mx-auto relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search for a question (e.g. 'warranty', 'delivery')..."
                className="w-full pl-12 pr-4 py-2 md:py-4 rounded-full border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="max-w-7xl mx-auto grid gap-6">
            {(() => {
              // Filter FAQs based on search term
              const filteredFaqs = faqs.filter((faq: any) =>
                faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
              );

              // Determine which ones to show (slice only if not searching)
              const displayFaqs = searchTerm
                ? filteredFaqs
                : (showAllFaqs ? filteredFaqs : filteredFaqs.slice(0, 4));

              if (displayFaqs.length === 0) {
                return <p className="text-center py-10 text-muted-foreground">No matching questions found.</p>;
              }

              return displayFaqs.map((faq: any, index: number) => (
                <div key={index} className="p-4 md:p-8 border border-border rounded-sm md:rounded-xl bg-card hover:border-primary transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h4 className="text-xl font-bold mb-4">{faq.question}</h4>
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              ));
            })()}
          </div>

          {/* Toggle Button - Hidden during search or if list is short */}
          {!searchTerm && faqs.length > 4 && (
            <div className="mt-12 text-center">
              <button
                onClick={() => setShowAllFaqs(!showAllFaqs)}
                className="inline-flex items-center gap-2 bg-primary text-white px-4 md:px-8 py-2 md:py-3 rounded-full font-bold shadow-lg hover:opacity-90 transition-all"
              >
                {showAllFaqs ? 'Show Less' : 'Show More Questions'}
                <svg className={`w-5 h-5 transition-transform duration-300 ${showAllFaqs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Policies */}
      <section id="privacy" className="py-24 max-md:py-12 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-12">Store Policies</h2>
            <div className="flex flex-col gap-8 text-muted-foreground">
              {policies.map((p: any, i: number) => (
                <div key={i} className="flex gap-4 md:gap-6 items-start p-4 md:p-6 bg-muted/30 rounded-sm md:rounded-lg">
                  <FaCheckCircle size={24} className="shrink-0 text-primary" />
                  <div>
                    <h3 className="font-bold text-foreground text-xl mb-2">{p.title}</h3>
                    <p className="leading-relaxed">{p.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
