'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FaTimes, FaShieldAlt } from 'react-icons/fa';

interface WarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  warrantyValue?: string;
}

const DEFAULT_WARRANTY_POLICY = `Please note:
1. Warranty does NOT cover self-inflicted or accidental damages (e.g., screen breaks, liquid spills, or physical impact).
2. Warranties are provided directly by the manufacturing companies, not by Quick Choice store.
3. If a product requires service, Quick Choice will facilitate sending it to the manufacturer. This process may take some time for repairs and return.
4. Returns/Exchanges: If a product is found to have a manufacturing defect within 2 days of purchase, it can be exchanged, provided it is in the exact condition it was purchased (including original packaging and accessories).`;

export default function WarrantyModal({ isOpen, onClose, warrantyValue }: WarrantyModalProps) {
  const [policy, setPolicy] = useState(DEFAULT_WARRANTY_POLICY);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  useEffect(() => {
    if (isOpen) {
      const fetchPolicy = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'settings', 'general'));
          if (docSnap.exists() && docSnap.data().warrantyPolicy) {
            setPolicy(docSnap.data().warrantyPolicy);
          }
        } catch (error) {
          console.error("Error fetching warranty policy:", error);
        }
      };
      fetchPolicy();
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-[var(--radius)] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-primary p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold">
            <FaShieldAlt />
            <span>Warranty Policy</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <FaTimes size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {warrantyValue && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-md mb-4">
              <p className="text-emerald-800 font-bold text-sm">
                The warranty period for this product is {warrantyValue} 
                {!isNaN(Number(warrantyValue)) && (Number(warrantyValue) > 1 ? ' years' : ' year')}
                {' '}depending on the specific product and manufacturer terms.
              </p>
            </div>
          )}
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
            {policy}
          </div>
        </div>
        <div className="p-4 bg-muted border-t border-border flex justify-end">
          <button 
            onClick={onClose}
            className="bg-primary text-white px-6 py-2 rounded-md font-bold text-sm hover:bg-primary-hover transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
