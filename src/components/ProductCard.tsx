'use client';

import { Product } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaEye, FaEllipsisV } from 'react-icons/fa';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LikeButton from './LikeButton';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const cycleImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % product.images.length);
  };

  return (
    <div className="card">
      <Link href={`/product/${product.id}`}>
        <div style={{ position: 'relative', height: '200px', width: '100%', cursor: 'pointer' }}>
          <Image 
            src={product.images[currentImgIndex]} 
            alt={product.name}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {product.isPromo && (
            <span style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              backgroundColor: 'var(--secondary)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              PROMO
            </span>
          )}
          <button 
            onClick={cycleImage}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: 'rgba(255,255,255,0.8)',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5
            }}
          >
            <FaEllipsisV size={18} />
          </button>
        </div>
      </Link>
      
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
            {product.category}
          </div>
          <LikeButton productId={product.id} />
        </div>
        <h3 style={{ 
          fontSize: '1.1rem', 
          marginBottom: '0.25rem', 
          fontWeight: '600',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }} title={product.name}>
          {product.name}
        </h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>
          By {product.manufacturer}
        </div>
        <p style={{ 
          fontSize: '0.875rem', 
          color: 'var(--muted-foreground)', 
          marginBottom: '1rem',
          height: '60px',
          overflowY: 'auto',
          paddingRight: '4px',
          lineHeight: '1.4'
        }} className="custom-scrollbar">
          {product.description}
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {product.oldPrice && (
              <span style={{ 
                fontSize: '0.85rem', 
                color: 'var(--muted-foreground)', 
                textDecoration: 'line-through',
                marginBottom: '-4px'
              }}>
                ₦{product.oldPrice.toLocaleString()}
              </span>
            )}
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              ₦{product.price.toLocaleString()}
            </span>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            onClick={() => addItem(product)}
          >
            <FaShoppingCart size={16} /> Add
          </button>
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
