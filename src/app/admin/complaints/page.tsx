'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { useAdmin } from '@/hooks/useAdmin';
import { db } from '@/lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import {
  FaCommentDots,
  FaExclamationTriangle,
  FaReply,
  FaStore,
  FaTrash,
  FaUserShield,
  FaPhoneAlt,
  FaEnvelope,
  FaWhatsapp,
} from 'react-icons/fa';

const COMPLAINTS_ROUTE = '/ADMIN/COMPLAINTS';

export default function AdminComplaintsPage() {
  const { user, adminData, isCEO } = useAdmin();
  const canModerate = isCEO || !!adminData?.vip;
  const canReplySpecialMessages = !!adminData?.specialStore && !!adminData?.specialStore?.slug;
  const [activeStream, setActiveStream] = useState<'general' | 'special'>('general');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; collectionName: 'complaints' | 'specialStoreMessages' } | null>(null);
  const [generalComplaints, setGeneralComplaints] = useState<any[]>([]);
  const [specialMessages, setSpecialMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const pageAccess = useMemo(() => {
    if (isCEO) return true;
    if (adminData?.vip && adminData?.assignedRoutes?.includes(COMPLAINTS_ROUTE)) return true;
    return !!adminData?.specialStore;
  }, [adminData, isCEO]);

  useEffect(() => {
    let unsubGeneral = () => {};
    let unsubSpecial = () => {};

    if (!user) return;

    if (canModerate) {
      unsubGeneral = onSnapshot(collection(db, 'complaints'), (snap) => {
        const items = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as any));
        setGeneralComplaints(items.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      }, (error) => {
        console.warn('General complaints listener error:', error);
      });
    }

    if (canModerate || adminData?.specialStore?.slug) {
      unsubSpecial = onSnapshot(collection(db, 'specialStoreMessages'), (snap) => {
        const items = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as any));
        setSpecialMessages(items.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      }, (error) => {
        console.warn('Special store message listener error:', error);
      });
    }

    return () => {
      unsubGeneral();
      unsubSpecial();
    };
  }, [user, canModerate, adminData]);

  const filteredSpecialMessages = specialMessages.filter((item) => {
    if (isCEO || adminData?.vip) return true;
    if (!adminData?.specialStore?.slug) return false;
    return item.storeSlug === adminData.specialStore.slug;
  });

  const generalUnread = generalComplaints.filter((item) => item.isNew).length;
  const specialUnread = filteredSpecialMessages.filter((item) => item.isNew !== false).length;

  const handleMarkAsRead = async (id: string, collectionName: 'complaints' | 'specialStoreMessages', isNew: boolean) => {
    if (isNew === false) return;
    try {
      await updateDoc(doc(db, collectionName, id), { isNew: false });
    } catch (error) {
      console.warn('Mark as read error:', error);
    }
  };

  const handleReply = async (id: string, collectionName: 'complaints' | 'specialStoreMessages') => {
    const message = (replyText[id] || '').trim();
    if (!message) {
      toast.error('Please enter a reply before sending.');
      return;
    }

    if (/https?:\/\//i.test(message)) {
      toast.error('External links are not allowed in replies.');
      return;
    }

    try {
      await updateDoc(doc(db, collectionName, id), {
        reply: message,
        replyAt: new Date(),
        isNew: false,
        isCustomerReplyRead: false,
      });
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      setReplyingId(null);
      toast.success('Reply sent successfully.');
    } catch (error) {
      console.error('Reply error:', error);
      toast.error('Could not send reply.');
    }
  };

  const handleDelete = (id: string, collectionName: 'complaints' | 'specialStoreMessages') => {
    setDeleteModal({ isOpen: true, id, collectionName });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteDoc(doc(db, deleteModal.collectionName, deleteModal.id));
      toast.success('Message deleted.');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete message.');
    } finally {
      setDeleteModal(null);
    }
  };

  if (!pageAccess) {
    return (
      <AdminGuard>
        <div className="max-w-xl mx-auto mt-10 rounded-2xl border border-border bg-card p-8 text-center">
          <FaUserShield className="mx-auto text-4xl text-primary mb-4" />
          <h1 className="text-2xl font-black mb-2">Access restricted</h1>
          <p className="text-sm text-muted-foreground">Only permitted VIP admins, special-store owners, or the CEO can open this page.</p>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Complaints Centre</h1>
            <p className="text-sm text-muted-foreground">Handle general customer complaints and special-store customer messages.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canModerate && (
            <button
              onClick={() => setActiveStream('general')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${activeStream === 'general' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
            >
              <FaCommentDots /> General Contact
              {generalUnread > 0 && <span className="bg-secondary text-white rounded-full px-1.5 text-[10px]">{generalUnread}</span>}
            </button>
          )}
          <button
            onClick={() => setActiveStream('special')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${activeStream === 'special' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
          >
            <FaStore /> Special Store
            {specialUnread > 0 && <span className="bg-secondary text-white rounded-full px-1.5 text-[10px]">{specialUnread}</span>}
          </button>
        </div>

        {activeStream === 'general' ? (
          <div className="space-y-4">
            {generalComplaints.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                <FaExclamationTriangle className="mx-auto text-3xl text-primary mb-3" />
                <h3 className="text-lg font-bold">No general complaints yet</h3>
                <p className="text-sm text-muted-foreground">Customer contact messages will appear here.</p>
              </div>
            ) : (
              generalComplaints.map((item) => (
                <div key={item.id} onClick={() => handleMarkAsRead(item.id, 'complaints', item.isNew)} className={`relative rounded-2xl border ${item.isNew ? 'border-primary shadow-sm cursor-pointer' : 'border-border'} bg-card p-4 md:p-5`}>
                  {item.isNew && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold z-10 shadow-sm animate-pulse">
                      NEW
                    </span>
                  )}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-primary">{item.name || 'Customer'}</div>
                      <div className="text-xs text-muted-foreground mt-1">{item.email || 'No email'} • {item.phone || 'No phone'}</div>
                      <div className="mt-3 whitespace-pre-wrap text-sm">{item.message}</div>
                      {item.reply && (
                        <div className="mt-3 rounded-xl bg-primary/5 border border-primary/10 p-3 text-sm">
                          <div className="text-[10px] font-black uppercase text-primary mb-1">Reply</div>
                          <div className="whitespace-pre-wrap">{item.reply}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.phone && (
                        <a href={`tel:${item.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center p-2 rounded-lg text-sm font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="Call">
                          <FaPhoneAlt size={16} />
                        </a>
                      )}
                      {item.email && (
                        <a href={`mailto:${item.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center p-2 rounded-lg text-sm font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20" title="Email">
                          <FaEnvelope size={16} />
                        </a>
                      )}
                      {item.phone && (
                        <a href={`https://wa.me/234${item.phone.replace(/^0+/, '')}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center p-2 rounded-lg text-sm font-bold bg-green-500/10 text-green-500 hover:bg-green-500/20" title="WhatsApp">
                          <FaWhatsapp size={16} />
                        </a>
                      )}
                      {canModerate && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id, 'complaints'); }}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-red-500/10 text-red-500"
                        >
                          <FaTrash /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* General complaints no longer use the reply system */}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSpecialMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                <FaStore className="mx-auto text-3xl text-primary mb-3" />
                <h3 className="text-lg font-bold">No special-store messages yet</h3>
                <p className="text-sm text-muted-foreground">Store customer chats will appear here.</p>
              </div>
            ) : (
              filteredSpecialMessages.map((item) => (
                <div key={item.id} onClick={() => handleMarkAsRead(item.id, 'specialStoreMessages', item.isNew !== false)} className={`relative rounded-2xl border ${item.isNew !== false ? 'border-primary shadow-sm cursor-pointer' : 'border-border'} bg-card p-4 md:p-5`}>
                  {item.isNew !== false && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold z-10 shadow-sm animate-pulse">
                      NEW
                    </span>
                  )}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-primary">{item.storeName || item.storeSlug || 'Special Store'}</div>
                      <div className="text-xs text-muted-foreground mt-1">From: {item.senderDisplayName || item.senderEmail || 'Customer'}</div>
                      <div className="mt-3 whitespace-pre-wrap text-sm">{item.message}</div>
                      {item.reply && (
                        <div className="mt-3 rounded-xl bg-primary/5 border border-primary/10 p-3 text-sm">
                          <div className="text-[10px] font-black uppercase text-primary mb-1">Vendor Reply</div>
                          <div className="whitespace-pre-wrap">{item.reply}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canReplySpecialMessages && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setReplyingId(item.id === replyingId ? null : item.id); }}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-primary/10 text-primary"
                        >
                          <FaReply /> {item.reply ? 'Update Reply' : 'Reply'}
                        </button>
                      )}
                      {(canModerate || item.senderUid === user?.uid) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id, 'specialStoreMessages'); }}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-red-500/10 text-red-500"
                        >
                          <FaTrash /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {replyingId === item.id && canReplySpecialMessages && (
                    <div className="mt-4 rounded-xl border border-border bg-background p-3">
                      <textarea
                        rows={3}
                        value={replyText[item.id] ?? item.reply ?? ''}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-full resize-none bg-transparent outline-none text-sm"
                        placeholder="Type vendor reply here…"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReply(item.id, 'specialStoreMessages'); }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold"
                        >
                          <FaReply /> Send Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {deleteModal?.isOpen && (
        <div className="fixed inset-0 z-[500] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl p-6 shadow-xl border border-border">
            <h3 className="text-xl font-bold mb-2">Delete Message</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminGuard>
  );
}
