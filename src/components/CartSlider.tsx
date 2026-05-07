'use client';

import { useCartStore } from '@/store/useCartStore';
import { FaTimes, FaPlus, FaMinus, FaTrashAlt, FaShoppingBag } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CartSliderProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSlider({ isOpen, onClose }: CartSliderProps) {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const [shouldRender, setShouldRender] = useState(false);

  // Handle animation timing
  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 cursor-pointer transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      />
      
      {/* Content */}
      <div 
        className={`relative w-full max-w-[400px] h-full bg-card shadow-[-4px_0_15px_rgba(0,0,0,0.1)] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onTransitionEnd={handleAnimationEnd}
      >
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Cart</h2>
          <button onClick={onClose} aria-label="Close cart" className="text-foreground hover:text-primary transition-colors"><FaTimes size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center mt-16 flex flex-col items-center">
              <FaShoppingBag size={64} className="text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Your cart is empty.</p>
              <Link 
                href="/shop" 
                onClick={onClose}
                className="border border-border text-foreground hover:bg-muted px-6 py-3 rounded-md font-semibold mt-6 inline-block transition-colors" 
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative w-[80px] h-[80px] rounded shrink-0 overflow-hidden">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h4 className="text-[0.9rem] font-semibold text-foreground">{item.name}</h4>
                      <button onClick={() => removeItem(item.id)} className="text-secondary hover:text-secondary-hover transition-colors"><FaTrashAlt size={16} /></button>
                    </div>
                    <div className="text-sm text-primary font-bold mb-2">
                      ₦{item.price.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        className="border border-border p-0.5 rounded hover:bg-muted text-foreground transition-colors"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <FaMinus size={14} />
                      </button>
                      <span className="text-sm font-medium">{item.quantity}</span>
                      <button 
                        className="border border-border p-0.5 rounded hover:bg-muted text-foreground transition-colors"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <FaPlus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {items.length > 0 && (
          <div className="p-6 border-t border-border bg-muted">
            <div className="flex justify-between mb-6 text-[1.1rem] font-bold">
              <span className="text-foreground">Total Amount:</span>
              <span className="text-primary">₦{getTotalPrice().toLocaleString()}</span>
            </div>
            <Link 
              href="/checkout" 
              onClick={onClose}
              className="bg-primary hover:bg-primary-hover text-white flex items-center justify-center rounded-md font-semibold px-6 py-3 w-full text-center transition-colors" 
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
