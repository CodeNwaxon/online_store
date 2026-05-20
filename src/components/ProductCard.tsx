'use client';

import { Product } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaEllipsisV } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LikeButton from './LikeButton';
import WarrantyModal from './WarrantyModal';


const getOrdinal = (d: number) => {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

interface ProductCardProps {
  product: Product;
  isAdmin?: boolean;
  priority?: boolean;
}

export default function ProductCard({ product, isAdmin, priority = false }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);


  const cycleImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % product.images.length);
  };

  const [imgError, setImgError] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const CardContent = (
    <div className={`relative h-48 max-md:h-40 w-full cursor-pointer bg-muted/20 p-1`}>
      <div className="relative w-full h-full overflow-hidden md:rounded-md">
        <Image
          src={imgError ? '/images/placeholder.png' : (product.images && product.images.length > 0 ? product.images[currentImgIndex] : product.image)}
          alt={product.name}
          fill
          className={`${isAdmin ? 'object-contain' : 'object-cover object-top'} transition-all duration-300 group-hover:scale-110`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgError(true)}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
        {!isAdmin && (product.quantity ?? 0) <= 0 && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 p-2 text-center select-none">
            <div className="bg-red-600/90 text-white font-black text-[10px] md:text-xs tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg border border-white/20 transform rotate-[-5deg] animate-pulse">
              Out of Stock
            </div>
          </div>
        )}
        {product.isPromo && (
          <span className="absolute top-0.5 left-0.5 bg-secondary text-white px-2 py-0.5 rounded text-[10px] md:text-xs font-bold z-10 shadow-sm flex flex-col items-center">
            <span>SPECIAL PROMO</span>
            {product.promoEndDate && (
              <span className="text-[10px] md:text-[11px] bg-white text-slate-800 px-1.5 py-0.5 rounded mt-1 border border-white/20 whitespace-nowrap">
                Ends {new Date(product.promoEndDate).getDate()}
                <span className="text-[7px] align-top font-normal">{getOrdinal(new Date(product.promoEndDate).getDate())}</span>
                {' '}{new Date(product.promoEndDate).toLocaleDateString('en-GB', { month: 'short' })}
              </span>
            )}
          </span>
        )}
        {isAdmin && (product.quantity ?? 0) <= 5 && (
          <div className="absolute top-1 right-10 bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black z-[40] shadow-lg border-2 border-white animate-bounce">
            {product.quantity}
          </div>
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
            <div className="absolute bottom-4 left-3 flex gap-1.5 max-md:gap-2.5 z-20">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(i); }}
                  className={`h-1 rounded-full transition-all duration-300 ${currentImgIndex === i
                    ? 'bg-primary w-4'
                    : 'bg-white/60 w-1.5 hover:bg-white'
                    }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative bg-card border border-border md:rounded-[var(--radius)] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md h-full flex flex-col group">
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
          {isAdmin && (
            <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
              {product.productCode}
            </div>
          )}
          {!isAdmin && <LikeButton productId={product.id} />}
        </div>
        <h3
          className="text-[0.95rem] max-md:text-[0.75rem] mb-0.5 font-bold whitespace-nowrap overflow-hidden text-ellipsis text-foreground/90"
          title={product.name}
        >
          {product.name}
        </h3>

        <div className="mt-2 flex flex-col md:flex-row justify-between items-start">
          {/* Manufacturer and warranty section */}
          <div className="flex flex-col justify-start items-start gap-2 mb-2">
            {product.manufacturer && (
              <span className="text-[0.65rem] text-muted-foreground font-medium italic">
                By {product.manufacturer.toUpperCase()}
              </span>
            )}
            {product.warranty && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowWarrantyModal(true);
                }}
                className="text-[0.65rem] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium border border-emerald-100/50 hover:bg-emerald-100 transition-colors"
              >
                ✓ {product.warranty} {!isNaN(Number(product.warranty)) && (Number(product.warranty) > 1 ? 'Years' : 'Year')} Warranty
              </button>
            )}
          </div>

          {/* Description button and overlay */}
          <button
            onClick={() => setShowDescription(true)}
            className="mb-2 md:mb-0 text-blue-700 underline font-semibold text-[11px] md:text-xs"
          >
            Description
          </button>
        </div>



        <WarrantyModal
          isOpen={showWarrantyModal}
          onClose={() => setShowWarrantyModal(false)}
          warrantyValue={product.warranty}
        />

        {showDescription && (
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-[3px] z-50 p-2 flex items-center justify-center animate-in fade-in duration-200"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDescription(false); }}
          >
            <div
              className="bg-card w-full max-h-[90%] rounded-md shadow-xl border border-border p-3 flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDescription(false); }}
                className="absolute top-1.5 right-1.5 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted text-foreground z-10"
              >
                ✕
              </button>
              <h3 className="text-[0.75rem] font-bold mb-1.5 pr-6 text-foreground leading-tight">{product.name}</h3>
              <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                <p className="text-[0.7rem] text-foreground/90 whitespace-pre-wrap">{product.description}</p>
              </div>
            </div>
          </div>
        )}
        {/* Price section */}
        <div className="flex flex-col">
          {product.oldPrice && (
            <span className="text-[0.75rem] text-muted-foreground line-through -mb-1 opacity-70">
              &#8358;{product.oldPrice.toLocaleString()}
            </span>
          )}
          <span className="text-lg max-md:text-[0.95rem] font-bold text-primary">
            &#8358;{product.price.toLocaleString()}
          </span>
          {isAdmin && product.rdpPrice && (
            <span className="text-[11px] md:text-xs font-bold text-black">
              RDP: &#8358;{product.rdpPrice.toLocaleString()}
            </span>
          )}
        </div>
        {isAdmin && (
          <div className={`px-2 py-0.5 rounded-full text-[0.65rem] font-black border transition-colors ${(product.quantity ?? 0) <= 5
            ? 'bg-red-50 text-red-600 border-red-200'
            : 'bg-muted text-muted-foreground border-border'
            }`}>
            Stock: {product.quantity}
          </div>
        )}
        {!isAdmin && (
          <button
            disabled={(product.quantity ?? 0) <= 0}
            className={`flex items-center justify-center gap-1.5 rounded-md font-bold transition-all duration-200 px-3 py-1.5 max-md:px-2 max-md:py-1 max-md:text-[0.65rem] text-[0.8rem] ${(product.quantity ?? 0) <= 0
              ? 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-50'
              : 'bg-primary hover:bg-primary-hover text-white'
              }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem(product);
            }}
          >
            <FaShoppingCart size={13} /> Add
          </button>
        )}
      </div>
    </div>
  );
}
