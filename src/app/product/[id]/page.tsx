'use client';

import { useParams } from 'next/navigation';
import { products } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaWhatsapp, FaArrowLeft } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function ProductDetail() {
  const params = useParams();
  const id = params.id as string;
  const product = products.find((p) => p.id === id);
  const addItem = useCartStore((state) => state.addItem);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!product) {
    return (
      <div className="section container" style={{ textAlign: 'center' }}>
        <h2>Product not found</h2>
        <Link href="/shop" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Shop</Link>
      </div>
    );
  }

  const whatsappMessage = `I want to make enquiries about ${product.name}, ${product.manufacturer}, and ₦${product.price.toLocaleString()}.`;
  const whatsappUrl = `https://wa.me/2347034632037?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="section">
      <div className="container">
        <Link href="/shop" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
          <FaArrowLeft size={16} /> Back to Shop
        </Link>

        <div className="grid grid-2" style={{ gap: '4rem', alignItems: 'flex-start' }}>
          {/* Left Side: Images */}
          <div>
            <div style={{ position: 'relative', height: '500px', width: '100%', borderRadius: 'var(--radius)', overflow: 'hidden', backgroundColor: 'var(--muted)' }}>
              <Image 
                src={product.images[activeImageIndex]} 
                alt={product.name}
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {product.images.map((img, index) => (
                <button 
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  style={{ 
                    position: 'relative', 
                    width: '80px', 
                    height: '80px', 
                    borderRadius: '4px', 
                    overflow: 'hidden',
                    border: activeImageIndex === index ? '2px solid var(--primary)' : '1px solid var(--border)',
                    flexShrink: 0
                  }}
                >
                  <Image src={img} alt={`${product.name} ${index}`} fill style={{ objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Details */}
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {product.category}
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{product.name}</h1>
            <div style={{ fontSize: '1.1rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
              Manufactured by <span style={{ fontWeight: '600', color: 'var(--foreground)' }}>{product.manufacturer}</span>
            </div>
            
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '2rem' }}>
              ₦{product.price.toLocaleString()}
            </div>

            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>Description</h3>
              <p style={{ color: 'var(--muted-foreground)', lineHeight: '1.6' }}>
                {product.description}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                onClick={() => addItem(product)}
              >
                <FaShoppingCart size={20} /> Purchase & Add to Cart
              </button>
              
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn" 
                style={{ 
                  width: '100%', 
                  padding: '1rem', 
                  fontSize: '1.1rem', 
                  backgroundColor: '#25D366', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}
              >
                <FaWhatsapp size={24} /> Contact us on WhatsApp
              </a>
            </div>
            
            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
              <div style={{ marginBottom: '0.5rem' }}><strong>Category:</strong> {product.category} {product.subcategory && `/ ${product.subcategory}`}</div>
              <div><strong>Product ID:</strong> {product.id}</div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @media (max-width: 768px) {
          .grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
