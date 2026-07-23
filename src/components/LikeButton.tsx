'use client';

import { useState, useEffect } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface LikeButtonProps {
  productId: string;
}

import { useLikeStore } from '@/store/useLikeStore';

interface LikeButtonProps {
  productId: string;
}

export default function LikeButton({ productId }: LikeButtonProps) {
  const [likes, setLikes] = useState(0);
  const { toggleLike, isLiked: checkIsLiked } = useLikeStore();
  const isLiked = checkIsLiked(productId);

  useEffect(() => {
    // Listen to real-time like count from Firestore
    const docRef = doc(db, 'product_likes', productId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setLikes(docSnap.data().count || 0);
      } else {
        setLikes(0);
      }
    }, (error) => {
      console.warn("Likes listener error:", error);
    });

    return () => unsubscribe();
  }, [productId]);

  const handleLike = async () => {
    if (!auth.currentUser) {
      toast.error('Please sign in to like products');
      return;
    }

    const docRef = doc(db, 'product_likes', productId);

    try {
      if (isLiked) {
        // Unlike
        await updateDoc(docRef, { count: increment(-1) });
      } else {
        // Like
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          await setDoc(docRef, { count: 1 });
        } else {
          await updateDoc(docRef, { count: increment(1) });
        }
      }
      toggleLike(productId);
    } catch (error) {
      console.error('Error updating likes:', error);
      toast.error('Failed to update like');
    }
  };

  return (
    <div className="flex items-center gap-[0.4rem]">
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLike(); }}
        className={`flex items-center transition-transform duration-200 hover:scale-125 ${isLiked ? 'text-[#ff4d4f]' : 'text-muted-foreground'}`}
      >
        {isLiked ? <FaHeart size={12} /> : <FaRegHeart size={12} />}
      </button>
      <span className="text-[9px] text-muted-foreground font-semibold">
        {likes}
      </span>
    </div>
  );
}
