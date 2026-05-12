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
  isAdmin?: boolean;
}

export default function ProductCard({ product, isAdmin }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const cycleImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % product.images.length);
  };

  const [imgError, setImgError] = useState(false);

  const CardContent = (
    <div className="relative h-[200px] max-md:h-[130px] w-full cursor-pointer bg-muted/20">
      <Image
        src={imgError ? '/images/placeholder.png' : (product.images && product.images.length > 0 ? product.images[currentImgIndex] : product.image)}
        alt={product.name}
        fill
        className="object-contain p-2 transition-all duration-300 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        onError={() => setImgError(true)}
      />
      {product.isPromo && (
        <span className="absolute top-2.5 left-2.5 bg-secondary text-white px-2 py-0.5 rounded text-xs font-bold z-10">
          PROMO
        </span>
      )}
      {product.images && product.images.length > 1 && (
        <>
          <button
            onClick={cycleImage}
            className="absolute top-2.5 right-2.5 bg-white/90 p-1.5 rounded-full flex items-center justify-center z-30 shadow-sm hover:bg-white transition-colors"
            title="See next image"
          >
            <FaEllipsisV size={14} className="text-primary" />
          </button>
          <div className="absolute bottom-2 left-3 flex gap-1.5 max-md:gap-2.5 z-20">
            {product.images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(i); }}
                className={`h-1 rounded-full transition-all duration-300 ${
                  currentImgIndex === i 
                    ? 'bg-primary w-4' 
                    : 'bg-white/60 w-1.5 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="bg-card border border-border md:rounded-[var(--radius)] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md h-full flex flex-col group">
      {!isAdmin ? (
        <Link href={`/product/${product.id}`}>
          {CardContent}
        </Link>
      ) : (
        CardContent
      )}

      <div className="p-3 max-md:p-2 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-1.5">
          <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
            {product.category}
          </div>
          {!isAdmin && <LikeButton productId={product.id} />}
        </div>
        <h3
          className="text-[0.95rem] max-md:text-[0.75rem] mb-0.5 font-bold whitespace-nowrap overflow-hidden text-ellipsis text-foreground/90"
          title={product.name}
        >
          {product.name}
        </h3>
        <div className="text-[0.75rem] text-muted-foreground mb-1.5 italic">
          By {product.manufacturer}
        </div>
        <p className="text-[0.75rem] max-md:text-[0.68rem] max-md:h-[32px] max-md:mb-1.5 text-muted-foreground mb-3 h-[45px] overflow-hidden leading-[1.3] line-clamp-3">
          {product.description}
        </p>

        <div className="flex justify-between items-center mt-auto pt-2 border-t border-border/50">
          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-[0.75rem] text-muted-foreground line-through -mb-1 opacity-70">
                ₦{product.oldPrice.toLocaleString()}
              </span>
            )}
            <span className="text-lg max-md:text-[0.95rem] font-bold text-primary">
              ₦{product.price.toLocaleString()}
            </span>
          </div>
          {isAdmin && (
            <div className="bg-muted px-1.5 py-0.5 rounded text-[0.6rem] font-bold text-muted-foreground border border-border">
              Stock: {product.quantity}
            </div>
          )}
          {!isAdmin && (
            <button
              className="bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-1.5 rounded-md font-bold transition-all duration-200 px-3 py-1.5 max-md:px-2 max-md:py-1 max-md:text-[0.65rem] text-[0.8rem]"
              onClick={() => addItem(product)}
            >
              <FaShoppingCart size={13} /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
