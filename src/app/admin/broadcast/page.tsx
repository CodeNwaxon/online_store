'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { FaBroadcastTower, FaImage, FaLink, FaPaperPlane, FaSave, FaCheckCircle, FaHandshake, FaStore, FaHistory, FaTrash, FaRedo, FaTimes, FaCreditCard } from 'react-icons/fa';
import { uploadImageToCloudinary } from '@/actions/upload';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, doc, getDoc, setDoc, onSnapshot, query, orderBy, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

export default function BroadcastAdmin() {
  const [loading, setLoading] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Templates state
  const [templates, setTemplates] = useState({
    orderDelivered: 'Your order has been delivered. You will get it shortly. Thank you for your patronage.',
    partnershipApproved: 'Congratulations! Your partnership request has been approved.',
    vendorOrder: 'A new order containing your products has been placed.',
    installmentNotification: 'A new installment plan has been started. Please review and follow up accordingly.',
  });

  // Manual broadcast state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [link, setLink] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [vendorsOnly, setVendorsOnly] = useState(false);

  // Sent Broadcasts History state
  const [history, setHistory] = useState<any[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'notification_templates'));
      if (docSnap.exists()) {
        setTemplates(prev => ({ ...prev, ...docSnap.data() as any }));
      }
    };
    fetchTemplates();

    // Listen to sent broadcasts for history
    const unsubHistory = onSnapshot(query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc')), (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubHistory();
  }, []);

  const saveTemplates = async () => {
    try {
      await setDoc(doc(db, 'settings', 'notification_templates'), templates);
      toast.success('Templates saved successfully!');
    } catch (error) {
      toast.error('Failed to save templates.');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrlInput('');
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrlInput(e.target.value);
    setImageFile(null);
    setImagePreview(e.target.value);
  };

  const handleReuse = (item: any) => {
    setTitle(item.title || '');
    setMessage(item.message || '');
    setImageUrlInput(item.image || '');
    setImagePreview(item.image || '');
    setLink(item.link || '');
    setLinkLabel(item.linkLabel || '');
    setVendorsOnly(item.vendorEmail === '__VENDORS_ONLY__');
    setImageFile(null);
    toast.success('Broadcast loaded into form for editing.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'broadcasts', id));
      toast.success('Broadcast deleted successfully!');
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Failed to delete broadcast.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required.');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = '';
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const data = await uploadImageToCloudinary(formData);
        finalImageUrl = data.secure_url;
      } else if (imageUrlInput) {
        finalImageUrl = imageUrlInput;
      }

      await addDoc(collection(db, 'broadcasts'), {
        title: title.trim(),
        message: message.trim(),
        image: finalImageUrl,
        link: link.trim(),
        linkLabel: linkLabel.trim() || 'View Link',
        type: 'broadcast',
        vendorEmail: vendorsOnly ? '__VENDORS_ONLY__' : '__ALL_USERS__',
        createdAt: new Date().toISOString(),
        serverTime: serverTimestamp()
      });

      toast.success('Broadcast sent successfully!');
      setTitle(''); setMessage(''); setImageFile(null); setImageUrlInput(''); setImagePreview('');
      setLink(''); setLinkLabel(''); setVendorsOnly(false);
    } catch (error) {
      toast.error('Failed to send broadcast.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearClick = () => {
    setShowPasskeyModal(true);
  };

  const executeClearNotifications = async () => {
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      const batch = writeBatch(db);
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      toast.success('All notifications cleared successfully!');
      setShowPasskeyModal(false);
      setPasskeyInput('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to clear notifications.');
    }
  };

  const verifyPasskey = async () => {
    if (!passkeyInput) return;
    setIsVerifying(true);
    
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const currentPasskey = settingsDoc.data()?.passkey || 'admin1234';
      
      if (passkeyInput === currentPasskey) {
        executeClearNotifications();
      } else {
        toast.error('Invalid CEO passkey');
        setPasskeyInput('');
      }
    } catch (error) {
      console.error('Error verifying passkey:', error);
      toast.error('Error verifying passkey');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AdminGuard requireCEO={false}>
      <div className="max-w-5xl mx-auto pb-20 px-2 md:px-0 space-y-4 md:space-y-8 relative">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <FaBroadcastTower className="text-primary" /> Broadcast & Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Customize automated notification templates and send manual broadcast messages.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          
          {/* Templates Section */}
          <div className="space-y-6">
            <div className="bg-card p-3 md:p-6 rounded-[var(--radius)] border border-border shadow-sm space-y-4 md:space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-3">
                <FaCheckCircle className="text-green-500" /> Automated Templates
              </h2>
              
              {/* Order Notification Template */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">Order Delivered Message</label>
                <p className="text-[10px] text-muted-foreground">Sent to customers when their order is marked as delivered.</p>
                <textarea 
                  rows={2}
                  value={templates.orderDelivered}
                  onChange={e => setTemplates({...templates, orderDelivered: e.target.value})}
                  className="w-full p-3 rounded-md border border-border bg-background text-sm focus:border-primary outline-none"
                />
              </div>

              {/* Partnership Approved Template */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">Partnership Approved Message</label>
                <p className="text-[10px] text-muted-foreground">Sent to users when their partnership request is approved.</p>
                <textarea 
                  rows={2}
                  value={templates.partnershipApproved}
                  onChange={e => setTemplates({...templates, partnershipApproved: e.target.value})}
                  className="w-full p-3 rounded-md border border-border bg-background text-sm focus:border-primary outline-none"
                />
              </div>

              {/* Vendor Order Template */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">Vendor Order Alert</label>
                <p className="text-[10px] text-muted-foreground">Sent to vendors when their items are ordered.</p>
                <textarea 
                  rows={2}
                  value={templates.vendorOrder}
                  onChange={e => setTemplates({...templates, vendorOrder: e.target.value})}
                  className="w-full p-3 rounded-md border border-border bg-background text-sm focus:border-primary outline-none"
                />
              </div>

              {/* Installment Notification Template */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2"><FaCreditCard className="text-primary" /> Installment Notification Message</label>
                <p className="text-[10px] text-muted-foreground">Sent to admins when a new installment plan or complaint is submitted.</p>
                <textarea 
                  rows={2}
                  value={templates.installmentNotification}
                  onChange={e => setTemplates({...templates, installmentNotification: e.target.value})}
                  className="w-full p-3 rounded-md border border-border bg-background text-sm focus:border-primary outline-none"
                />
              </div>

              <button 
                onClick={saveTemplates}
                className="w-full py-3 bg-secondary text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm hover:bg-secondary/90 transition-all"
              >
                <FaSave /> Save Templates
              </button>
            </div>
          </div>

          {/* Manual Broadcast Section */}
          <form onSubmit={handleSubmit} className="bg-card p-3 md:p-6 rounded-[var(--radius)] border border-border shadow-sm space-y-4 md:space-y-6 h-fit sticky top-24">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-3">
              <FaPaperPlane className="text-primary" /> Send Manual Broadcast
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-bold">Message Title</label>
              <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., New Feature Alert!" className="w-full p-3 rounded-md border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Message Body</label>
              <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What do you want to tell your users?" className="w-full p-3 rounded-md border border-border bg-background text-sm focus:border-primary outline-none resize-y" />
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
               <label className="text-sm font-bold flex items-center gap-2"><FaImage /> Attach Image (Optional)</label>
               <div className="flex flex-col gap-4">
                  <input type="text" placeholder="Paste Image URL..." value={imageUrlInput} onChange={handleImageUrlChange} className="w-full p-3 rounded-md border border-border bg-background text-sm" />
                  <label className="flex items-center justify-center gap-2 p-3 rounded-md border border-dashed border-primary bg-primary/5 text-primary font-bold cursor-pointer hover:bg-primary/10 text-sm">
                    Upload File Instead
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {imagePreview && (
                    <div className="relative w-full h-32 rounded-lg border border-border overflow-hidden bg-muted">
                      <Image src={imagePreview} alt="Preview" fill className="object-contain" />
                    </div>
                  )}
               </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
               <label className="text-sm font-bold flex items-center gap-2"><FaLink /> Attach Action Link (Optional)</label>
               <div className="grid grid-cols-2 gap-4">
                   <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="w-full p-3 rounded-md border border-border bg-background text-sm" />
                   <input type="text" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Button Label" className="w-full p-3 rounded-md border border-border bg-background text-sm" />
               </div>
            </div>

            <div className="pt-3 md:pt-4 border-t border-border">
               <label className="flex items-center gap-2 cursor-pointer font-bold text-sm bg-muted/50 p-2.5 md:p-3 rounded-lg border border-border">
                 <input type="checkbox" checked={vendorsOnly} onChange={(e) => setVendorsOnly(e.target.checked)} className="w-4 h-4 accent-primary" />
                 Send to Vendors Only
               </label>
               <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                 {vendorsOnly ? 'This broadcast will be sent to vendor admins only.' : 'This broadcast will be sent to all users including vendors.'}
               </p>
            </div>

            <button type="submit" disabled={loading} className={`w-full py-4 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all ${loading ? 'opacity-70' : 'hover:bg-primary-hover hover:-translate-y-1'}`}>
              <FaPaperPlane /> {loading ? 'Sending...' : 'Send Broadcast'}
            </button>
          </form>

          {/* Clear Notifications Section */}
          <div className="bg-card p-3 md:p-6 rounded-[var(--radius)] border border-border shadow-sm space-y-4 md:space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-3 text-red-500">
              <FaTrash /> Danger Zone
            </h2>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Clear all system notifications (new orders, vendor alerts, installments). This will completely wipe the database logs to save space. It will NOT affect broadcasts.</p>
              <button onClick={handleClearClick} className="w-full py-3 bg-red-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm hover:bg-red-700 transition-all">
                <FaTrash /> Clear All Notifications
              </button>
            </div>
          </div>
        </div>

        {/* Broadcast History */}
        <div className="mt-6 md:mt-12 space-y-4 md:space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
            <FaHistory className="text-primary" /> Sent Broadcasts History
          </h2>
          {history.length === 0 ? (
             <p className="text-muted-foreground text-sm italic">No broadcasts sent yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.map((item) => (
                <div key={item.id} className="relative p-4 rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${item.type === 'broadcast' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {item.type?.replace('_', ' ') || 'Notification'}
                      </span>
                      {item.vendorEmail === '__VENDORS_ONLY__' ? (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                          Vendors Only
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          All Users
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                  
                  <h4 className="text-sm font-bold text-primary mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
                  
                  {item.image && (
                    <div className="mt-3 relative w-full h-24 rounded-lg overflow-hidden border border-border bg-muted/50">
                      <Image src={item.image} alt="Notification Image" fill className="object-cover" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border/50">
                    <button 
                      onClick={() => handleReuse(item)}
                      className="text-xs font-bold text-secondary bg-secondary/10 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-secondary hover:text-white transition-colors"
                    >
                      <FaRedo size={10} /> Reuse
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <FaTrash size={10} /> Delete
                    </button>
                  </div>

                  {/* Delete Confirmation Overlay */}
                  {deleteConfirmId === item.id && (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 rounded-xl border border-red-200 animate-in fade-in zoom-in duration-200">
                       <h3 className="font-bold text-red-600 mb-2">Delete this broadcast?</h3>
                       <p className="text-[10px] text-muted-foreground text-center mb-4">This will remove it from history, but it may still be in users' local notifications.</p>
                       <div className="flex gap-2 w-full">
                         <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-1.5 text-xs font-bold border border-border rounded-lg hover:bg-muted">Cancel</button>
                         <button onClick={() => handleDelete(item.id)} className="flex-1 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CEO PASSKEY MODAL ── */}
        {showPasskeyModal && (
          <div className="fixed inset-0 z-[6000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-card p-8 rounded-3xl shadow-2xl w-full max-w-md text-center border-2 border-red-500/50 animate-in slide-in-from-bottom duration-300">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaTrash size={28} />
              </div>
              <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter text-red-500">Danger Zone</h3>
              <p className="text-muted-foreground mb-8 text-xs font-bold uppercase tracking-widest opacity-80">
                Enter CEO passkey to permanently wipe database notifications.
              </p>
              <input
                type="password"
                className="w-full bg-muted border border-border rounded-2xl p-5 text-center text-2xl font-black tracking-[1em] mb-6 focus:border-red-500 outline-none transition-all shadow-inner"
                placeholder="••••"
                autoFocus
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyPasskey()}
              />
              <div className="flex gap-4">
                <button
                  onClick={() => { setShowPasskeyModal(false); setPasskeyInput(''); }}
                  className="flex-1 py-4 font-black text-xs uppercase border border-border rounded-2xl hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={isVerifying}
                  onClick={verifyPasskey}
                  className={`flex-1 py-4 font-black text-xs uppercase bg-red-600 text-white rounded-2xl shadow-lg shadow-red-600/20 transition-all ${isVerifying ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'}`}
                >
                  {isVerifying ? 'Verifying...' : 'Authorize Wipe'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
