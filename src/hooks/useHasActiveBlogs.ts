'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isBlogPostExpired } from '@/lib/blogUtils';

export function useHasActiveBlogs(): boolean {
  const [hasActiveBlogs, setHasActiveBlogs] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'blogs'), (snapshot) => {
      setHasActiveBlogs(snapshot.docs.some(blog => !isBlogPostExpired(blog.data())));
    }, (error) => {
      console.warn('Blog availability listener error:', error);
      setHasActiveBlogs(false);
    });
  }, []);

  return hasActiveBlogs;
}