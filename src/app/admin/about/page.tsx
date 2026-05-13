'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaSave, FaPlus, FaTrash, FaInfoCircle, FaQuestionCircle, FaShieldAlt, FaUndo } from 'react-icons/fa';

export default function AdminAboutEditor() {
  const [heroText, setHeroText] = useState('');
  const [missionStatement, setMissionStatement] = useState('');
  const [faqs, setFaqs] = useState<{ question: string, answer: string }[]>([]);
  const [policies, setPolicies] = useState<{ title: string, content: string }[]>([]);

  // Track the original data to detect "dirty" state
  const [originalData, setOriginalData] = useState<any>(null);

  useEffect(() => {
    const fetchAboutData = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'about'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHeroText(data.heroText || '');
        setMissionStatement(data.missionStatement || '');
        setFaqs(data.faqs || []);
        setPolicies(data.policies || []);
        // Store the snapshot for comparison
        setOriginalData(data);
      }
    };
    fetchAboutData();
  }, []);

  // Determine if any field has changed
  const isDirty = JSON.stringify({
    heroText,
    missionStatement,
    faqs,
    policies,
  }) !== JSON.stringify({
    heroText: originalData?.heroText || '',
    missionStatement: originalData?.missionStatement || '',
    faqs: originalData?.faqs || [],
    policies: originalData?.policies || [],
  });

  const handleSave = async () => {
    try {
      const newData = { heroText, missionStatement, faqs, policies };
      await setDoc(doc(db, 'settings', 'about'), newData, { merge: true });
      setOriginalData(newData); // Update original data so bar disappears
      toast.success('About page sections updated!');
    } catch (error) {
      toast.error('Failed to save changes.');
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setHeroText(originalData.heroText || '');
      setMissionStatement(originalData.missionStatement || '');
      setFaqs(originalData.faqs || []);
      setPolicies(originalData.policies || []);
      toast('Changes discarded', { icon: '🔄' });
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-12 pb-20">
      <header className="flex flex-col md:flex-row gap-3 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">About Page Editor</h1>
          <p className="text-muted-foreground mt-1">Manage sections for your About page.</p>
        </div>
        <button onClick={handleSave} className="bg-primary text-white px-4 md:px-8 md:py-3 py-2 rounded-md font-bold flex items-center gap-2">
          <FaSave /> Save Sections
        </button>
      </header>

      <section className="bg-card p-4 md:p-8 rounded-[var(--radius)] border border-border shadow-sm space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2"><FaInfoCircle className="text-primary" /> Main Content</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Hero Section Text</label>
            <textarea
              rows={3}
              className="w-full p-3 rounded-md border border-border bg-background"
              value={heroText}
              onChange={(e) => setHeroText(e.target.value)}
              placeholder="The big headline at the top of the About page..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Our Mission / Story</label>
            <textarea
              rows={6}
              className="w-full p-3 rounded-md border border-border bg-background"
              value={missionStatement}
              onChange={(e) => setMissionStatement(e.target.value)}
              placeholder="Tell your brand story here..."
            />
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="bg-card p-4 md:p-8 rounded-[var(--radius)] border border-border shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><FaQuestionCircle className="text-primary" /> FAQ</h2>
          <button onClick={() => setFaqs([...faqs, { question: '', answer: '' }])} className="bg-primary/10 text-primary p-2 rounded-full hover:bg-primary/20 transition-colors">
            <FaPlus />
          </button>
        </div>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="p-4 border border-border rounded-md bg-muted/30 relative">
              <button onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-secondary">
                <FaTrash size={14} />
              </button>
              <div className="space-y-3">
                <input
                  placeholder="Question"
                  className="w-full p-2 rounded border border-border bg-background font-bold"
                  value={faq.question}
                  onChange={(e) => {
                    const newFaqs = [...faqs];
                    newFaqs[i].question = e.target.value;
                    setFaqs(newFaqs);
                  }}
                />
                <textarea
                  placeholder="Answer"
                  className="w-full p-2 rounded border border-border bg-background text-sm"
                  rows={2}
                  value={faq.answer}
                  onChange={(e) => {
                    const newFaqs = [...faqs];
                    newFaqs[i].answer = e.target.value;
                    setFaqs(newFaqs);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* POLICIES SECTION */}
      <section className="bg-card p-4 md:p-8 rounded-[var(--radius)] border border-border shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><FaShieldAlt className="text-primary" /> Store Policies</h2>
          <button onClick={() => setPolicies([...policies, { title: '', content: '' }])} className="bg-primary/10 text-primary p-2 rounded-full hover:bg-primary/20 transition-colors">
            <FaPlus />
          </button>
        </div>
        <div className="space-y-6">
          {policies.map((policy, i) => (
            <div key={i} className="p-4 border border-border rounded-md bg-muted/30 relative">
              <button onClick={() => setPolicies(policies.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-secondary">
                <FaTrash size={14} />
              </button>
              <div className="space-y-3">
                <input
                  placeholder="Policy Title (e.g. Return Policy)"
                  className="w-full p-2 rounded border border-border bg-background font-bold"
                  value={policy.title}
                  onChange={(e) => {
                    const newPolicies = [...policies];
                    newPolicies[i].title = e.target.value;
                    setPolicies(newPolicies);
                  }}
                />
                <textarea
                  placeholder="Policy Details"
                  className="w-full p-2 rounded border border-border bg-background text-sm"
                  rows={4}
                  value={policy.content}
                  onChange={(e) => {
                    const newPolicies = [...policies];
                    newPolicies[i].content = e.target.value;
                    setPolicies(newPolicies);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="p-6 bg-muted rounded-[var(--radius)] border border-border">
        <p className="text-sm text-muted-foreground italic">
          * Location, CEO Profile, and Contact Info are managed in <strong>Admin Management</strong> and <strong>Site Settings</strong> and will automatically appear on the About page.
        </p>
      </div>

      {/* DIRTY SAVE BAR */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[600px] bg-card border border-primary shadow-2xl rounded-full p-2 pl-6 flex justify-between items-center z-50 animate-in fade-in slide-in-from-bottom-4">
          <p className="text-sm font-medium">You have unsaved changes</p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-full transition-colors flex items-center gap-2"
            >
              <FaUndo size={12} /> Discard
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary/90 shadow-lg flex items-center gap-2"
            >
              <FaSave size={12} /> Update Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}