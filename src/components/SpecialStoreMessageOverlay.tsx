'use client';

import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { FaGoogle, FaPaperPlane, FaReply, FaStore, FaTimes, FaTrash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface SpecialStoreMessageOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  storeData: {
    slug?: string;
    name?: string;
    ownerEmail?: string;
    ownerUid?: string;
  } | null;
}

interface StoreMessageItem {
  id: string;
  storeSlug?: string;
  senderUid?: string;
  senderDisplayName?: string;
  senderEmail?: string;
  message?: string;
  reply?: string;
  createdAt?: { seconds?: number; nanoseconds?: number } | null;
}

const ALLOWED_HOSTS = [
  'nomostores.com',
  'nomo-store.vercel.app',
  'localhost:3000'
];

function validateMessageText(message: string) {
  const matches = message.match(/https?:\/\/[^\s]+/gi) || [];
  if (!matches.length) return true;

  return matches.every((url) => {
    try {
      const parsed = new URL(url);
      const host = parsed.host.toLowerCase();
      const isAllowed = ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
      return isAllowed;
    } catch {
      return false;
    }
  });
}

export default function SpecialStoreMessageOverlay({
  isOpen,
  onClose,
  storeData,
}: SpecialStoreMessageOverlayProps) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<StoreMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [chatWipeDays, setChatWipeDays] = useState(30);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setAuthUser(currentUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      const data = snap.data();
      const configuredDays = Number(data?.specialStoreMessageDurationDays || data?.chatWipeDurationDays || 30);
      setChatWipeDays(configuredDays > 0 ? configuredDays : 30);
    }, (error) => {
      console.warn('Special store settings listener error:', error);
      setChatWipeDays(30);
    });

    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (!isOpen || !storeData?.slug || !authUser) return;

    const markThreadAsRead = async () => {
      try {
        const q = query(collection(db, 'specialStoreMessages'), where('senderUid', '==', authUser.uid));
        const snap = await getDocs(q);
        const updates = snap.docs
          .filter((docSnap) => {
            const data = docSnap.data();
            return data.storeSlug === storeData.slug && data.senderUid === authUser.uid && data.reply && data.isCustomerReplyRead !== true && !data.isDeleted;
          })
          .map((docSnap) => updateDoc(doc(db, 'specialStoreMessages', docSnap.id), {
            isCustomerReplyRead: true,
            readByCustomerAt: serverTimestamp(),
          }));

        await Promise.all(updates);
      } catch (error) {
        console.warn('Special store read-sync error:', error);
      }
    };

    markThreadAsRead();

    const q = query(collection(db, 'specialStoreMessages'), where('senderUid', '==', authUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      const cutoff = now - (chatWipeDays * 24 * 60 * 60 * 1000);

      const items: StoreMessageItem[] = snap.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            storeSlug: data.storeSlug,
            senderUid: data.senderUid,
            senderDisplayName: data.senderDisplayName,
            senderEmail: data.senderEmail,
            message: data.message,
            reply: data.reply,
            createdAt: data.createdAt,
          };
        })
        .filter((item) => item.storeSlug === storeData.slug && item.senderUid === authUser.uid && !item.reply?.includes('deleted'))
        .filter((item) => {
          const createdAt = item.createdAt?.seconds ? item.createdAt.seconds * 1000 : 0;
          if (!createdAt) return true;
          return createdAt >= cutoff;
        })
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
          const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
          return aTime - bTime;
        });

      setMessages(items);
    }, (error) => {
      console.warn('Special store message listener error:', error);
    });

    return () => unsub();
  }, [isOpen, storeData?.slug, authUser, chatWipeDays]);

  const storeName = useMemo(() => storeData?.name || 'Special Store', [storeData?.name]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Signed in successfully.');
    } catch (error) {
      toast.error('Google sign in failed.');
    }
  };

  const handleSend = async () => {
    if (!authUser || !storeData?.slug) return;
    if (!message.trim()) return;

    if (!validateMessageText(message)) {
      toast.error('Only approved Nomo links are allowed in messages.');
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, 'specialStoreMessages'), {
        storeSlug: storeData.slug,
        storeName,
        vendorEmail: storeData.ownerEmail || '',
        vendorUid: storeData.ownerUid || '',
        senderUid: authUser.uid,
        senderEmail: authUser.email || '',
        senderDisplayName: authUser.displayName || authUser.email || 'Customer',
        senderType: 'customer',
        message: message.trim(),
        reply: '',
        replyAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isDeleted: false,
        isCustomerReplyRead: true,
        isNew: true,
      });

      toast.success('Your message has been sent to the store.');
      setMessage('');
    } catch (error) {
      console.error('Error sending special store message:', error);
      toast.error('Unable to send your message right now.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteOwn = (id: string) => {
    if (!authUser) return;
    setDeleteModalId(id);
  };

  const confirmDelete = async () => {
    if (!deleteModalId) return;
    try {
      await deleteDoc(doc(db, 'specialStoreMessages', deleteModalId));
      toast.success('Message deleted.');
    } catch (error) {
      console.error('Delete message error:', error);
      toast.error('Failed to delete message.');
    } finally {
      setDeleteModalId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-[var(--radius)] bg-card border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <FaStore />
            </div>
            <div>
              <h3 className="font-black text-lg">Message {storeName}</h3>
              <p className="text-xs text-muted-foreground">Secure store chat</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
            <FaTimes />
          </button>
        </div>

        {!authUser ? (
          <div className="p-6 md:p-8">
            <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
              <h4 className="text-xl font-black mb-2">Sign in to message this store</h4>
              <p className="text-sm text-muted-foreground mb-5">You need to be signed in with Google to send a secure message to this special store.</p>
              <button
                onClick={handleGoogleLogin}
                className="inline-flex items-center gap-2 bg-primary text-white font-bold px-5 py-3 rounded-xl"
              >
                <FaGoogle /> Continue with Google
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-4">
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  Start the conversation by sending your first message.
                </div>
              ) : (
                messages.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-primary">{item.senderDisplayName || 'Customer'}</div>
                        <div className="text-sm mt-1 whitespace-pre-wrap">{item.message}</div>
                        {item.reply && (
                          <div className="mt-3 rounded-lg bg-primary/5 border border-primary/10 p-2">
                            <div className="text-[10px] uppercase font-black text-primary">Vendor reply</div>
                            <div className="text-sm mt-1 whitespace-pre-wrap">{item.reply}</div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteOwn(item.id)}
                        className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Delete your message"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here…"
                className="w-full resize-none outline-none bg-transparent text-sm"
              />
              <div className="flex items-center justify-between gap-3 mt-3">
                <div className="text-[10px] text-muted-foreground font-semibold">
                  Messages are protected to approved Nomo links only.
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                  className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60"
                >
                  <FaPaperPlane /> {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteModalId && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl p-6 shadow-xl border border-border">
            <h3 className="text-xl font-bold mb-2">Delete Message</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Do you really want to delete your message? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalId(null)}
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
    </div>
  );
}
