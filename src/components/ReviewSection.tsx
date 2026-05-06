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
      // fetchReviews(); // No longer needed with onSnapshot
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
      setDeletingId(null); // Reset even on error
    }
  };

  const hasReviewed = user && reviews.some(r => r.userEmail === user.email);

  return (
    <section className="section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>What Our Customers Say</h2>
          {!hasReviewed && (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel Feedback' : 'Send us your feedback'}
            </button>
          )}
          {hasReviewed && (
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
              You have already shared your experience. Thank you!
            </div>
          )}
        </div>

        {showForm && (
          <div style={{ 
            maxWidth: '600px', 
            margin: '0 auto 3rem auto', 
            padding: '2rem', 
            backgroundColor: 'var(--card)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius)' 
          }}>
            <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Share your experience</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <FaStar 
                  key={s} 
                  size={24} 
                  color={s <= rating ? '#FFD700' : 'var(--border)'} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setRating(s)}
                />
              ))}
            </div>

            <textarea 
              placeholder="Tell us what you think..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '1rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                marginBottom: '1.5rem',
                fontFamily: 'inherit'
              }}
            />

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={handlePostReview}
              disabled={loading}
            >
              {loading ? 'Posting...' : <><FaPaperPlane /> Post Review</>}
            </button>
          </div>
        )}

        <div className="reviews-container">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="card review-card" style={{ padding: '2rem', textAlign: 'center', position: 'relative' }}>
                {user && (user.email === review.userEmail || user.uid === "MRAnZKmiEDcg5xVOjMOtbULMOtb2") && (
                  <button 
                    onClick={() => setDeletingId(review.id)}
                    style={{ 
                      position: 'absolute', 
                      top: '1rem', 
                      right: '1rem', 
                      background: 'none', 
                      border: 'none', 
                      color: 'red', 
                      cursor: 'pointer' 
                    }}
                  >
                    <FaTrash size={14} />
                  </button>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', color: '#FFD700', marginBottom: '1rem' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <FaStar key={s} size={16} fill={s <= review.rating ? "#FFD700" : "var(--border)"} />
                  ))}
                </div>
                <p style={{ fontStyle: 'italic', marginBottom: '1.5rem', color: 'var(--muted-foreground)' }}>
                  "{review.comment}"
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  {review.userImage && (
                    <img 
                      src={review.userImage} 
                      alt={review.userName} 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} 
                    />
                  )}
                  <div style={{ fontWeight: 'bold' }}>{review.userName}</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Verified Buyer</div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', width: '100%', color: 'var(--muted-foreground)' }}>No reviews yet. Be the first to share your experience!</p>
          )}
        </div>

        {/* Delete Confirmation Overlay */}
        {deletingId && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
          }}>
            <div className="card" style={{ 
              padding: '1.5rem', 
              maxWidth: '320px', 
              width: '100%', 
              height: 'auto', // Override global height: 100%
              textAlign: 'center',
              display: 'block' // Override global flex
            }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>Delete Review?</h3>
              <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Are you sure? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn" 
                  style={{ flex: 1, border: '1px solid var(--border)', fontSize: '0.875rem', padding: '0.5rem' }}
                  onClick={() => setDeletingId(null)}
                >
                  Cancel
                </button>
                <button 
                  className="btn" 
                  style={{ flex: 1, backgroundColor: '#ff4d4f', color: 'white', fontSize: '0.875rem', padding: '0.5rem' }}
                  onClick={handleDeleteReview}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .reviews-container {
            display: flex;
            gap: 2rem;
            overflow-x: auto;
            padding: 1rem 0 2rem 0;
            scroll-snap-type: x mandatory;
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .reviews-container::-webkit-scrollbar {
            display: none;
          }
          .review-card {
            flex: 0 0 350px;
            scroll-snap-align: start;
          }
          @media (max-width: 768px) {
            .reviews-container {
              flex-direction: column;
              overflow-x: hidden;
              overflow-y: auto;
              max-height: 500px; /* Adjust height to show ~2 cards */
              padding-right: 0.5rem;
            }
            .reviews-container::-webkit-scrollbar {
              display: block;
              width: 4px;
            }
            .reviews-container::-webkit-scrollbar-thumb {
              background: var(--border);
              border-radius: 10px;
            }
            .review-card {
              flex: 0 0 auto;
              width: 100%;
            }
          }
        `}</style>
      </div>
    </section>
  );
}
