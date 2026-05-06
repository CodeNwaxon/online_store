'use client';

import { useParams } from 'next/navigation';
import { products } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaWhatsapp, FaArrowLeft, FaCreditCard } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import ProductCard from '@/components/ProductCard';

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

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'nowrap' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 2, padding: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => addItem(product)}
              >
                <FaShoppingCart size={18} /> Buy Now
              </button>
              
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn" 
                style={{ 
                  flex: 1,
                  padding: '0.75rem', 
                  backgroundColor: '#25D366', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="WhatsApp"
              >
                <FaWhatsapp size={22} />
              </a>

              <Link 
                href={`/installments?search=${encodeURIComponent(product.name)}`}
                className="btn" 
                style={{ 
                  flex: 2,
                  padding: '0.75rem', 
                  backgroundColor: 'var(--foreground)', 
                  color: 'var(--background)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem', // xs
                  fontWeight: '600'
                }}
              >
                <FaCreditCard size={18} /> Installment Payment
              </Link>
            </div>
            
            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
              <div style={{ marginBottom: '0.5rem' }}><strong>Category:</strong> {product.category} {product.subcategory && `/ ${product.subcategory}`}</div>
              <div><strong>Product ID:</strong> {product.id}</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '6rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2.5rem' }}>You May Also Like</h2>
          <div className="grid grid-4">
            {products
              .filter(p => p.id !== product.id)
              .sort((a, b) => {
                // Priority 1: Same subcategory
                if (a.subcategory === product.subcategory && b.subcategory !== product.subcategory) return -1;
                if (b.subcategory === product.subcategory && a.subcategory !== product.subcategory) return 1;
                // Priority 2: Same category
                if (a.category === product.category && b.category !== product.category) return -1;
                if (b.category === product.category && a.category !== product.category) return 1;
                return 0;
              })
              .slice(0, 4)
              .map(relatedProduct => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
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
