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
        <div className="flex overflow-x-auto gap-1 md:gap-[0.6rem] snap-x snap-mandatory pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {products.map(product => (
            <div key={product.id} className="min-w-[10.5rem] w-[10.5rem] shrink-0 snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
