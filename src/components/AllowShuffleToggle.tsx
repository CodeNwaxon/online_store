'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { saveShuffleSettingAction } from '@/actions/shuffle';

interface AllowShuffleToggleProps {
  collectionKey: string;
}

export default function AllowShuffleToggle({ collectionKey }: AllowShuffleToggleProps) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'shuffle'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setEnabled(!!data?.[collectionKey]);
        }
      },
      (err) => {
        console.warn('Shuffle settings listener error:', err);
      }
    );
    return () => unsub();
  }, [collectionKey]);

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    setIsUpdating(true);
    try {
      await setDoc(doc(db, 'settings', 'shuffle'), { [collectionKey]: checked }, { merge: true });
      toast.success(checked ? 'Shuffle enabled' : 'Shuffle disabled');
    } catch {
      try {
        const res = await saveShuffleSettingAction(collectionKey, checked);
        if (res.success) {
          toast.success(checked ? 'Shuffle enabled' : 'Shuffle disabled');
        } else {
          throw new Error(res.error || 'Failed to save');
        }
      } catch {
        setEnabled(!checked);
        toast.error('Failed to update shuffle setting');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-xs md:text-sm font-semibold bg-muted/60 hover:bg-muted px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg border border-border transition-colors shrink-0">
      <input
        type="checkbox"
        checked={enabled}
        disabled={isUpdating}
        onChange={(e) => handleToggle(e.target.checked)}
        className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
      />
      <span className="text-foreground">
        <span className="hidden md:inline">Allow </span>Shuffle
      </span>
    </label>
  );
}
