'use client';

import { useCartStore } from '@/store/useCartStore';
import { FaTimes, FaPlus, FaMinus, FaTrashAlt, FaShoppingBag } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';

interface CartSliderProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSlider({ isOpen, onClose }: CartSliderProps) {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      {/* Backdrop */}
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', cursor: 'pointer' }} 
        onClick={onClose}
      />
      
      {/* Content */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '400px',
        height: '100%',
        backgroundColor: 'var(--card)',
        boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideIn 0.3s ease-out'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Your Cart</h2>
          <button onClick={onClose} aria-label="Close cart"><FaTimes size={24} /></button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
              <FaShoppingBag size={64} style={{ color: 'var(--muted-foreground)', marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ color: 'var(--muted-foreground)' }}>Your cart is empty.</p>
              <Link 
                href="/shop" 
                onClick={onClose}
                className="btn btn-outline" 
                style={{ marginTop: '1.5rem' }}
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '4px', overflow: 'hidden' }}>
                    <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '600' }}>{item.name}</h4>
                      <button onClick={() => removeItem(item.id)} style={{ color: 'var(--secondary)' }}><FaTrashAlt size={16} /></button>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      ₦{item.price.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button 
                        style={{ border: '1px solid var(--border)', padding: '2px', borderRadius: '4px' }}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <FaMinus size={14} />
                      </button>
                      <span style={{ fontSize: '0.875rem' }}>{item.quantity}</span>
                      <button 
                        style={{ border: '1px solid var(--border)', padding: '2px', borderRadius: '4px' }}
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
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <span>Total Amount:</span>
              <span style={{ color: 'var(--primary)' }}>₦{getTotalPrice().toLocaleString()}</span>
            </div>
            <Link 
              href="/checkout" 
              onClick={onClose}
              className="btn btn-primary" 
              style={{ width: '100%' }}
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
