'use client';

import { useState } from 'react';
import { Product } from '@/data/products';
import ProductCard from './ProductCard';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface PromoCarouselProps {
  products: Product[];
}

export default function PromoCarousel({ products }: PromoCarouselProps) {
  const [startIndex, setStartIndex] = useState(0);
  const itemsToShow = 4; // Display 4 cards at a time
  const totalItems = products.length;

  const nextSlide = () => {
    setStartIndex((prev) => (prev + 1) % (totalItems - itemsToShow + 1));
  };

  const prevSlide = () => {
    setStartIndex((prev) => (prev - 1 + (totalItems - itemsToShow + 1)) % (totalItems - itemsToShow + 1));
  };

  const displayedProducts = products.slice(startIndex, startIndex + itemsToShow);

  return (
    <div style={{ position: 'relative', width: '100%' }} className="promo-carousel-container">
      {/* Desktop Slider View */}
      <div className="desktop-carousel-view">
        <div className="grid grid-4" style={{ transition: 'all 0.5s ease-in-out' }}>
          {displayedProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {totalItems > itemsToShow && (
          <>
            <button 
              onClick={prevSlide}
              style={{
                position: 'absolute',
                left: '-1.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'transparent',
                color: 'var(--primary)',
                opacity: 0.4,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                transition: 'opacity 0.2s'
              }}
              className="carousel-arrow"
              title="Previous"
            >
              <FaChevronLeft size={44} />
            </button>
            <button 
              onClick={nextSlide}
              style={{
                position: 'absolute',
                right: '-1.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'transparent',
                color: 'var(--primary)',
                opacity: 0.4,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                transition: 'opacity 0.2s'
              }}
              className="carousel-arrow"
              title="Next"
            >
              <FaChevronRight size={44} />
            </button>
          </>
        )}
      </div>

      {/* Mobile Swipe View */}
      <div className="mobile-carousel-view">
        <div style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          gap: '1rem', 
          scrollSnapType: 'x mandatory',
          paddingBottom: '1rem',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }} className="hide-scrollbar">
          {products.map(product => (
            <div key={product.id} style={{ minWidth: 'calc(50% - 0.5rem)', scrollSnapAlign: 'start' }}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .carousel-arrow:hover {
          opacity: 1 !important;
        }
        @media (min-width: 769px) {
          .desktop-carousel-view { display: block; }
          .mobile-carousel-view { display: none; }
          .promo-carousel-container { padding: 0 2rem; }
        }
        @media (max-width: 768px) {
          .desktop-carousel-view { display: none; }
          .mobile-carousel-view { display: block; }
          .promo-carousel-container { padding: 0 1rem; }
        }
      `}</style>
    </div>
  );
}
