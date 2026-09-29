'use client';

import { useEffect, useRef } from 'react';
import { FaSignOutAlt, FaTimes } from 'react-icons/fa';

interface SignOutConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SignOutConfirmation({ isOpen, onConfirm, onCancel }: SignOutConfirmationProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]"
    >
      <div ref={cardRef} className="relative bg-background border border-border rounded-2xl px-7 pt-8 pb-7 max-w-[380px] w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.05)] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Close button */}
        <button
          onClick={onCancel}
          aria-label="Close"
          className="absolute top-3 right-3 bg-transparent border-none text-muted-foreground cursor-pointer p-1.5 rounded-md flex items-center justify-center text-sm transition-all duration-150 hover:bg-muted hover:text-foreground"
        >
          <FaTimes />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-[1.4rem] shadow-[0_8px_24px_rgba(239,68,68,0.3)] animate-pulse">
            <FaSignOutAlt />
          </div>
        </div>

        {/* Text */}
        <h3 id="signout-title" className="text-xl font-bold text-foreground mb-2">Sign Out?</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Are you sure you want to sign out? You&apos;ll need to sign in again to access your account.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-[0.7rem] px-4 rounded-[0.625rem] text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-200 bg-muted border border-border text-foreground hover:bg-border"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-[0.7rem] px-4 rounded-[0.625rem] text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-200 bg-gradient-to-br from-red-500 to-red-600 border-none text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:from-red-600 hover:to-red-700 hover:shadow-[0_6px_16px_rgba(239,68,68,0.4)] hover:-translate-y-px active:translate-y-0"
          >
            <FaSignOutAlt />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
