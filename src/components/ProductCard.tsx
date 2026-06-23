'use client';

import { Product } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaEllipsisV, FaEdit, FaTrash } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LikeButton from './LikeButton';
import WarrantyModal from './WarrantyModal';
import { toast } from 'react-hot-toast';


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
  index?: number;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

const cardThemes = [
  { accent: 'text-primary', borderTop: 'border-primary', btn: 'bg-primary hover:bg-primary-hover', lightBg: 'bg-primary/10', lightBorder: 'border-primary/20' },
  { accent: 'text-blue-600', borderTop: 'border-blue-600', btn: 'bg-blue-600 hover:bg-blue-700', lightBg: 'bg-blue-50', lightBorder: 'border-blue-100' },
  { accent: 'text-rose-600', borderTop: 'border-rose-600', btn: 'bg-rose-600 hover:bg-rose-700', lightBg: 'bg-rose-50', lightBorder: 'border-rose-100' },
  { accent: 'text-teal-600', borderTop: 'border-teal-600', btn: 'bg-teal-600 hover:bg-teal-700', lightBg: 'bg-teal-50', lightBorder: 'border-teal-100' },
  { accent: 'text-amber-600', borderTop: 'border-amber-600', btn: 'bg-amber-600 hover:bg-amber-700', lightBg: 'bg-amber-50', lightBorder: 'border-amber-100' },
  { accent: 'text-violet-600', borderTop: 'border-violet-600', btn: 'bg-violet-600 hover:bg-violet-700', lightBg: 'bg-violet-50', lightBorder: 'border-violet-100' },
  { accent: 'text-emerald-600', borderTop: 'border-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', lightBg: 'bg-emerald-50', lightBorder: 'border-emerald-100' },
  { accent: 'text-orange-600', borderTop: 'border-orange-600', btn: 'bg-orange-600 hover:bg-orange-700', lightBg: 'bg-orange-50', lightBorder: 'border-orange-100' },
  { accent: 'text-indigo-600', borderTop: 'border-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700', lightBg: 'bg-indigo-50', lightBorder: 'border-indigo-100' },
  { accent: 'text-fuchsia-600', borderTop: 'border-fuchsia-600', btn: 'bg-fuchsia-600 hover:bg-fuchsia-700', lightBg: 'bg-fuchsia-50', lightBorder: 'border-fuchsia-100' },
  { accent: 'text-lime-600', borderTop: 'border-lime-600', btn: 'bg-lime-600 hover:bg-lime-700', lightBg: 'bg-lime-50', lightBorder: 'border-lime-100' },
  { accent: 'text-cyan-600', borderTop: 'border-cyan-600', btn: 'bg-cyan-600 hover:bg-cyan-700', lightBg: 'bg-cyan-50', lightBorder: 'border-cyan-100' },
];

export default function ProductCard({ product, isAdmin, priority = false, index = 0, onEdit, onDelete }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);

  const theme = cardThemes[index % 12];


  const cycleImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % product.images.length);
  };

  const [imgError, setImgError] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const sanitizeImageUrl = (url: string) => {
    if (!url) return '/images/placeholder.png';
    try {
      if (url.includes('_next/image?url=')) {
        const urlObj = new URL(url.startsWith('http') ? url : `http://localhost${url}`);
        const actualUrl = urlObj.searchParams.get('url');
        if (actualUrl) return actualUrl;
      }
    } catch (e) { }
    return url;
  };

  const rawImgUrl = imgError ? '/images/placeholder.png' : (product.images && product.images.length > 0 ? product.images[currentImgIndex] : product.image);
  const safeImgUrl = sanitizeImageUrl(rawImgUrl);

  const CardContent = (
    <div className={`relative h-45 max-md:h-40 w-full cursor-pointer bg-muted/20 p-0.5`}>
      <div className="relative w-full h-full overflow-hidden rounded-[calc(var(--radius)-2px)] md:rounded-[calc(var(--radius)-1px)]">
        <Image
          src={safeImgUrl}
          alt={product.name}
          fill
          className={`${isAdmin ? 'object-contain' : 'object-cover object-top'} transition-all duration-300 group-hover:scale-110`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgError(true)}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
        {(product.quantity ?? 0) <= 0 && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 p-2 text-center select-none">
            <div className="bg-red-600/90 text-white font-black text-[10px] md:text-xs tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg border border-white/20 transform rotate-[-5deg] animate-pulse">
              Out of Stock
            </div>
          </div>
        )}
        {product.isPromo && (
          <span className={`absolute top-0.5 left-0.5 ${theme.btn.split(' ')[0]} text-white px-1 md:px-2 py-0.5 rounded text-[8px] md:text-xs font-bold z-10 shadow-sm flex flex-col items-center`}>
            <span>SPECIAL PROMO</span>
            {product.promoEndDate && (
              <span className="text-[8px] md:text-[11px] bg-white text-slate-800 px-1 md:px-1.5 py-0.5 rounded mt-0.5 md:mt-1 border border-white/20 whitespace-nowrap">
                Ends {new Date(product.promoEndDate).getDate()}
                <span className="text-[5px] md:text-[7px] align-top font-normal">{getOrdinal(new Date(product.promoEndDate).getDate())}</span>
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
              <FaEllipsisV size={14} className={theme.accent} />
            </button>
            <div className="absolute bottom-4 left-3 flex gap-1.5 max-md:gap-2.5 z-20">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(i); }}
                  className={`h-1 rounded-full transition-all duration-300 ${currentImgIndex === i
                    ? `${theme.btn.split(' ')[0]} w-4`
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
    <div className={`relative bg-white border-x border-b border-muted shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-lg md:rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 h-full flex flex-col group`}>
      {isAdmin && onEdit && onDelete && (
        <div className="absolute top-14 right-2 z-[40] flex flex-col gap-2 transition-all duration-300 opacity-100 translate-x-0 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:translate-x-0 md:translate-x-4">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(product); }}
            className="bg-primary text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-white/20"
            title="Edit Product"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(product.id); }}
            className="bg-red-500 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-white/20"
            title="Delete Product"
          >
            <FaTrash size={14} />
          </button>
        </div>
      )}
      <div className={`w-full h-[3px] shrink-0 ${theme.btn.split(' ')[0]}`} />
      {!isAdmin ? (
        <Link href={`/product/${product.id}?theme=${index}`}>
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
        <div className="flex flex-col mb-0.5">
          <h3
            className={`text-[0.95rem] max-md:text-[0.75rem] font-bold whitespace-nowrap overflow-hidden text-ellipsis ${theme.accent} leading-tight`}
            title={product.name}
          >
            {product.name}
          </h3>
          {product.group && (product.group.toUpperCase().includes('PHONE') || product.group.toUpperCase().includes('PHONES') || product.group.toUpperCase().includes('LAPTOP') || product.group.toUpperCase().includes('LAPTOPS')) && product.ramRom && (
            <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mt-0.5 font-bold">
              ({product.ramRom}) GB
            </div>
          )}
        </div>

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
                className={`text-[0.65rem] px-1.5 py-0.5 rounded font-medium border transition-colors ${theme.accent} ${theme.lightBg} ${theme.lightBorder} hover:opacity-80`}
              >
                ✓ {product.warranty} {!isNaN(Number(product.warranty)) && (Number(product.warranty) > 1 ? 'Years' : 'Year')} Warranty
              </button>
            )}
          </div>

          {/* Description button and overlay */}
          <button
            onClick={() => setShowDescription(true)}
            className={`mb-2 md:mb-0 underline font-semibold text-[11px] md:text-xs ${theme.accent}`}
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
        <div className='flex items-end justify-between'>
          {/* Price section */}
          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-[0.75rem] text-muted-foreground line-through -mb-1 opacity-70">
                &#8358;{product.oldPrice.toLocaleString()}
              </span>
            )}
            <span className={`text-lg max-md:text-[0.95rem] font-bold ${theme.accent}`}>
              &#8358;{product.price.toLocaleString()}
            </span>
            {isAdmin && product.rdpPrice && (
              <span className="text-[11px] md:text-xs font-bold text-black">
                RDP: &#8358;{product.rdpPrice.toLocaleString()}
              </span>
            )}
          </div>
          {isAdmin && (
            <div className="flex flex-col">
              <div className="text-[0.55rem] text-muted-foreground uppercase">
                <span className="text-black font-bold">kg: </span>{product.size}
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[0.65rem] font-black border transition-colors ${(product.quantity ?? 0) <= 5
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-muted text-muted-foreground border-border'
                }`}>
                Stock: {product.quantity}
              </div>
            </div>
          )}
          {!isAdmin && (
            <button
              disabled={(product.quantity ?? 0) <= 0}
              className={`flex items-center justify-center gap-1.5 rounded md:rounded-md font-bold transition-all duration-200 px-3 py-1.5 max-md:px-2 max-md:py-1 max-md:text-[0.65rem] text-[0.8rem] ${(product.quantity ?? 0) <= 0
                ? 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-50'
                : `${theme.btn} text-white`
                }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addItem(product);
                toast.success(`${product.name} added to cart`, {
                  style: {
                    fontSize: '11px',
                    padding: '4px 8px',
                    minWidth: '120px',
                    marginTop: '20px'
                  },
                  position: 'bottom-center',
                  duration: 2000,
                });
              }}
            >
              <FaShoppingCart size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
