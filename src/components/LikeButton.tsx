'use client';

import { useState, useEffect } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface LikeButtonProps {
  productId: string;
}

export default function LikeButton({ productId }: LikeButtonProps) {
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    // 1. Check local storage for user's like status
    const storedLikes = JSON.parse(localStorage.getItem('user_likes') || '{}');
    setIsLiked(!!storedLikes[productId]);

    // 2. Listen to real-time like count from Firestore
    const docRef = doc(db, 'product_likes', productId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setLikes(docSnap.data().count || 0);
      } else {
        setLikes(0);
      }
    });

    return () => unsubscribe();
  }, [productId]);

  const handleLike = async () => {
    if (!auth.currentUser) {
      toast.error('Please sign in to like products');
      return;
    }

    const docRef = doc(db, 'product_likes', productId);
    const storedLikes = JSON.parse(localStorage.getItem('user_likes') || '{}');

    try {
      if (isLiked) {
        // Unlike
        await updateDoc(docRef, { count: increment(-1) });
        delete storedLikes[productId];
        setIsLiked(false);
      } else {
        // Like
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          await setDoc(docRef, { count: 1 });
        } else {
          await updateDoc(docRef, { count: increment(1) });
        }
        storedLikes[productId] = true;
        setIsLiked(true);
      }
      localStorage.setItem('user_likes', JSON.stringify(storedLikes));
    } catch (error) {
      console.error('Error updating likes:', error);
      toast.error('Failed to update like');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLike(); }}
        style={{ 
          color: isLiked ? '#ff4d4f' : 'var(--muted-foreground)',
          display: 'flex',
          alignItems: 'center',
          transition: 'transform 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isLiked ? <FaHeart size={18} /> : <FaRegHeart size={18} />}
      </button>
      <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: '600' }}>
        {likes}
      </span>
    </div>
  );
}
