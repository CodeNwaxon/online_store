'use client';

import { useState, useRef } from 'react';
import { Product } from '@/data/products';
import ProductCard from './ProductCard';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface PromoCarouselProps {
  products: Product[];
}

export default function PromoCarousel({ products }: PromoCarouselProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemsToShow = 4; // Display 4 cards at a time
  const totalItems = products.length;

  const nextSlide = () => {
    setStartIndex((prev) => (prev + 1) % (totalItems - itemsToShow + 1));
  };

  const prevSlide = () => {
    setStartIndex((prev) => (prev - 1 + (totalItems - itemsToShow + 1)) % (totalItems - itemsToShow + 1));
  };

  const handleMobileScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const itemWidth = 168 + 4; // 10.5rem (168px) + gap-1 (4px)
      
      // If we're at the very end of the scroll, force the last dot
      if (scrollLeft + clientWidth >= scrollWidth - 5) {
        setActiveMobileIndex(totalItems - 1);
      } else {
        const index = Math.round(scrollLeft / itemWidth);
        setActiveMobileIndex(index);
      }
    }
  };

  const displayedProducts = products.slice(startIndex, startIndex + itemsToShow);

  return (
    <div className="relative w-full px-2 md:px-8">
      {/* Desktop Slider View */}
      <div className="hidden md:block">
        <div className="grid grid-cols-4 gap-8 transition-all duration-500 ease-in-out">
          {displayedProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {totalItems > itemsToShow && (
          <>
            <button
              onClick={prevSlide}
              className="absolute -left-6 top-1/2 -translate-y-1/2 bg-transparent text-primary opacity-40 hover:opacity-100 border-none flex items-center justify-center cursor-pointer z-10 transition-opacity duration-200"
              title="Previous"
            >
              <FaChevronLeft size={44} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute -right-6 top-1/2 -translate-y-1/2 bg-transparent text-primary opacity-40 hover:opacity-100 border-none flex items-center justify-center cursor-pointer z-10 transition-opacity duration-200"
              title="Next"
            >
              <FaChevronRight size={44} />
            </button>
          </>
        )}
      </div>

      {/* Mobile Swipe View */}
      <div className="block md:hidden">
        <div 
          ref={scrollRef}
          onScroll={handleMobileScroll}
          className="flex overflow-x-auto gap-1 md:gap-[0.6rem] snap-x snap-mandatory pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {products.map(product => (
            <div key={product.id} className="min-w-[10.5rem] w-[10.5rem] shrink-0 snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        
        {/* Mobile Dots */}
        <div className="flex justify-center gap-1.5 mt-2">
          {products.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-300 ${activeMobileIndex === i ? 'bg-primary w-4' : 'bg-border w-1'}`}
            />
          ))}
        </div>
      </div>

      {/* Desktop Dots */}
      <div className="hidden md:flex justify-center gap-2 mt-8">
        {Array.from({ length: totalItems - itemsToShow + 1 }).map((_, i) => (
          <button
            key={i}
            onClick={() => setStartIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${startIndex === i ? 'bg-primary w-8' : 'bg-border w-2 hover:bg-primary/40'}`}
          />
        ))}
      </div>
    </div>
  );
}
