import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

export function useSpecialStoreUnreadCount(storeSlug?: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!storeSlug || !user) {
      setUnreadCount(0);
      return;
    }

    const q = query(collection(db, 'specialStoreMessages'), where('senderUid', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      let count = 0;
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          data.storeSlug === storeSlug &&
          data.senderUid === user.uid &&
          data.reply &&
          data.isCustomerReplyRead !== true &&
          !data.isDeleted
        ) {
          count++;
        }
      });
      setUnreadCount(count);
    });

    return () => unsub();
  }, [storeSlug, user]);

  return unreadCount;
}
