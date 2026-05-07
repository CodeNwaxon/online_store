'use client';

import { Product } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaEllipsisV } from 'react-icons/fa';
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
    <div className="bg-card border border-border rounded md:rounded-[var(--radius)] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md h-full flex flex-col group">
      <Link href={`/product/${product.id}`}>
        <div className="relative h-[200px] max-md:h-[130px] w-full cursor-pointer">
          <Image
            src={product.images[currentImgIndex]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {product.isPromo && (
            <span className="absolute top-2.5 left-2.5 bg-secondary text-white px-2 py-0.5 rounded text-xs font-bold z-10">
              PROMO
            </span>
          )}
          <button
            onClick={cycleImage}
            className="absolute top-2.5 right-2.5 bg-white/80 p-1 rounded-full flex items-center justify-center z-10"
          >
            <FaEllipsisV size={18} />
          </button>
        </div>
      </Link>

      <div className="p-5 max-md:p-2.5 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs text-muted-foreground uppercase">
            {product.category}
          </div>
          <LikeButton productId={product.id} />
        </div>
        <h3
          className="text-[1.1rem] max-md:text-[0.8rem] mb-1 font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
          title={product.name}
        >
          {product.name}
        </h3>
        <div className="text-[0.85rem] text-muted-foreground mb-2">
          By {product.manufacturer}
        </div>
        <p className="text-[0.875rem] max-md:text-[0.72rem] max-md:h-[36px] max-md:mb-2 text-muted-foreground mb-4 h-[60px] overflow-y-auto pr-1 leading-[1.4] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
          {product.description}
        </p>

        <div className="flex justify-between items-center mt-auto">
          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-[0.85rem] text-muted-foreground line-through -mb-1">
                ₦{product.oldPrice.toLocaleString()}
              </span>
            )}
            <span className="text-xl font-bold text-primary">
              ₦{product.price.toLocaleString()}
            </span>
          </div>
          <button
            className="bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-200 px-4 py-2 max-md:px-2 max-md:py-1 max-md:text-[0.72rem] text-[0.875rem]"
            onClick={() => addItem(product)}
          >
            <FaShoppingCart size={16} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
