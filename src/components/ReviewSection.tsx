'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { FaStar, FaTrash, FaPaperPlane } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function ReviewSection() {
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(reviewsData);
    }, (error) => {
      console.error("Firestore Error:", error);
      // Simple fallback without ordering
      getDocs(collection(db, 'reviews')).then(snap => {
        setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeReviews();
    };
  }, []);

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

      // Check if user already has a review
      const q = query(collection(db, 'reviews'), where('userEmail', '==', currentUser.email));
      const existingReviews = await getDocs(q);

      if (!existingReviews.empty) {
        toast.error('You have already posted a review. Delete your existing one to post a new one.');
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
      setComment('');
      setShowForm(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to post review.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'reviews', deletingId));
      toast.success('Review deleted.');
      setDeletingId(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete review.');
      setDeletingId(null);
    }
  };

  const hasReviewed = user && reviews.some(r => r.userEmail === user.email);

  return (
    <section className="py-16">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">What Our Customers Say</h2>
          {!hasReviewed && (
            <button
              className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-[var(--radius)] px-6 py-3 transition-colors"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel Feedback' : 'Send us your feedback'}
            </button>
          )}
          {hasReviewed && (
            <div className="text-xs md:text-[0.9rem] text-muted-foreground">
              You have already shared your experience. Thank you!
            </div>
          )}
        </div>

        {showForm && (
          <div className="max-w-[600px] mx-auto mb-12 p-8 bg-card border border-border rounded-[var(--radius)] shadow-sm">
            <h3 className="mb-6 text-center text-xl font-semibold">Share your experience</h3>

            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((s) => (
                <FaStar
                  key={s}
                  size={24}
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
              className="w-full min-h-[120px] p-4 rounded-[var(--radius)] border border-border bg-background mb-6 font-sans outline-none focus:border-primary resize-y"
            />

            <button
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold flex items-center justify-center gap-2 rounded-[var(--radius)] p-3 transition-colors disabled:opacity-50"
              onClick={handlePostReview}
              disabled={loading}
            >
              {loading ? 'Posting...' : <><FaPaperPlane /> Post Review</>}
            </button>
          </div>
        )}

        <div className="flex gap-8 overflow-x-auto pt-2 pb-4 md:py-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-md:flex-col max-md:overflow-x-hidden max-md:overflow-y-auto max-md:max-h-[500px] max-md:pr-2 max-md:[&::-webkit-scrollbar]:block max-md:[&::-webkit-scrollbar]:w-1 max-md:[&::-webkit-scrollbar-thumb]:bg-border max-md:[&::-webkit-scrollbar-thumb]:rounded-full">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="shrink-0 flex-none w-full md:w-[350px] md:snap-start bg-card border border-border rounded-[var(--radius)] p-8 text-center relative shadow-sm max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
                {user && (user.email === review.userEmail || user.uid === "MRAnZKmiEDcg5xVOjMOtbULMOtb2") && (
                  <button
                    onClick={() => setDeletingId(review.id)}
                    className="absolute top-4 right-4 bg-transparent border-none text-red-500 cursor-pointer hover:text-red-700 transition-colors p-2"
                  >
                    <FaTrash size={14} />
                  </button>
                )}
                <div className="flex justify-center gap-1 text-[#FFD700] mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <FaStar key={s} size={16} fill={s <= review.rating ? "#FFD700" : "var(--border)"} />
                  ))}
                </div>
                <p className="italic mb-6 text-muted-foreground leading-relaxed">
                  "{review.comment}"
                </p>
                <div className="flex flex-col items-center gap-2">
                  {review.userImage && (
                    <img
                      src={review.userImage}
                      alt={review.userName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                    />
                  )}
                  <div className="font-bold">{review.userName}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Verified Buyer</div>
              </div>
            ))
          ) : (
            <p className="text-center w-full text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
          )}
        </div>

        {/* Delete Confirmation Overlay */}
        {deletingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
            <div className="bg-card border border-border rounded-[var(--radius)] p-6 max-w-[320px] w-full text-center shadow-xl">
              <h3 className="mb-3 text-xl font-bold">Delete Review?</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Are you sure? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 border border-border rounded-md text-sm p-2 hover:bg-muted transition-colors text-foreground font-medium"
                  onClick={() => setDeletingId(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 bg-[#ff4d4f] hover:bg-[#e04345] text-white rounded-md text-sm p-2 transition-colors font-medium"
                  onClick={handleDeleteReview}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
