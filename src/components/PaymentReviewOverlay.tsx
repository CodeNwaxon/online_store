'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { FaStar, FaPaperPlane, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

export default function PaymentReviewOverlay({ onClose }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checkingReview, setCheckingReview] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user already reviewed
        try {
          const q = query(collection(db, 'reviews'), where('userEmail', '==', currentUser.email));
          const existingReviews = await getDocs(q);
          if (!existingReviews.empty) {
            setHasReviewed(true);
            onClose(); // Auto close if already reviewed
          }
        } catch (e) {
          console.error("Error checking review:", e);
        }
      }
      setCheckingReview(false);
    });

    return () => unsubscribeAuth();
  }, [onClose]);

  const handlePostReview = async () => {
    if (!comment.trim()) {
      toast.error('Please write a comment.');
      return;
    }

    setLoading(true);
    try {
      let currentUser = user;
      if (!currentUser) {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
        setUser(currentUser);
      }

      // Check again if they have a review just in case they just logged in
      const q = query(collection(db, 'reviews'), where('userEmail', '==', currentUser.email));
      const existingReviews = await getDocs(q);

      if (!existingReviews.empty) {
        toast.error('You have already posted a review.');
        setHasReviewed(true);
        onClose();
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'reviews'), {
        userId: currentUser.uid,
        userName: currentUser.displayName?.split(' ')[0] || 'Anonymous',
        userEmail: currentUser.email,
        userImage: currentUser.photoURL,
        rating,
        comment,
        createdAt: serverTimestamp()
      });

      toast.success('Review posted successfully!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to post review.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingReview || hasReviewed) return null;

  return (
    <div className="absolute -inset-4 md:-inset-8 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-4 rounded-xl">
      <div className="bg-card border border-border p-5 max-md:p-2 rounded-xl shadow-2xl max-w-xs md:max-w-sm w-full relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          title="Close"
        >
          <FaTimes size={16} />
        </button>

        <h3 className="text-sm md:text-lg font-bold mb-1 pr-6">Enjoying your purchase Experience?</h3>
        <p className="text-[10px] md:text-xs text-muted-foreground mb-4 max-md:mb-2">Leave a quick review to let us know how we did!</p>

        <div className="flex justify-center gap-2 mb-4 max-md:mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <FaStar
              key={s}
              size={18}
              color={s <= rating ? '#FFD700' : 'var(--border)'}
              className="cursor-pointer transition-transform hover:scale-110"
              onClick={() => setRating(s)}
            />
          ))}
        </div>

        <textarea
          placeholder="Tell us what you think..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full min-h-[60px] md:min-h-[80px] p-3 rounded-lg border border-border bg-background mb-4 max-md:mb-3 font-sans outline-none focus:border-primary resize-y text-xs"
        />

        <button
          className="w-full bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2 rounded-lg p-2.5 transition-colors disabled:opacity-50 shadow-md text-sm"
          onClick={handlePostReview}
          disabled={loading}
        >
          {loading ? 'Posting...' : <><FaPaperPlane size={14} /> Send us your feedback</>}
        </button>
      </div>
    </div>
  );
}
