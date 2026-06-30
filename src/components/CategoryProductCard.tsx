'use client';

import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaEllipsisV, FaEdit, FaTrash } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export interface CategoryProduct {
  id: string;
  name: string;
  costPrice: number;
  price: number;
  description: string;
  group: string;
  category: string;
  quantity?: number;
  images?: string[];
  image?: string;
  updatedAt?: string;
}

interface CategoryProductCardProps {
  product: CategoryProduct;
  isAdmin?: boolean;
  priority?: boolean;
  onEdit?: (product: CategoryProduct) => void;
  onDelete?: (id: string) => void;
  themeClass: string;
  categoryName: string;
  detailPath: string; // e.g. /shop/cosmetics/
}

export default function CategoryProductCard({
  product,
  isAdmin,
  priority = false,
  onEdit,
  onDelete,
  themeClass,
  categoryName,
  detailPath
}: CategoryProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const cycleImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.images && product.images.length > 0) {
      setCurrentImgIndex((prev) => (prev + 1) % product.images!.length);
    }
  };

  const [imgError, setImgError] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [currentImgIndex]);

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

  const rawImgUrl = imgError ? '/images/placeholder.png' : (product.images && product.images.length > 0 ? product.images[currentImgIndex] : product.image || '/images/placeholder.png');
  const safeImgUrl = sanitizeImageUrl(rawImgUrl);

  const CardContent = (
    <div className={`relative h-45 max-md:h-40 w-full cursor-pointer bg-muted/20 p-0.5 dark:bg-muted/10`}>
      <div className="relative w-full h-full overflow-hidden rounded-[calc(var(--radius)-2px)] md:rounded-[calc(var(--radius)-1px)]">
        <Image
          src={safeImgUrl}
          alt={product.name}
          fill
          className={`object-cover md:object-contain object-top transition-all duration-300 group-hover:scale-110`}
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
        {isAdmin && (product.quantity ?? 0) <= 5 && (
          <div className="absolute top-1 right-10 bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black z-[40] shadow-lg border-2 border-white animate-bounce">
            {product.quantity}
          </div>
        )}
        {product.images && product.images.length > 1 && (
          <>
            <button
              onClick={cycleImage}
              className="absolute top-2.5 right-2.5 bg-white/90 dark:bg-zinc-800/90 p-1.5 rounded-full flex items-center justify-center z-30 shadow-sm hover:bg-white dark:hover:bg-zinc-700 transition-colors"
              title="See next image"
            >
              <FaEllipsisV size={14} className="text-slate-800 dark:text-zinc-200" />
            </button>
            <div className="absolute bottom-4 left-3 flex gap-1.5 max-md:gap-2.5 z-20">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(i); }}
                  className={`h-1 rounded-full transition-all duration-300 ${currentImgIndex === i
                    ? `${themeClass} w-4`
                    : 'bg-white/60 dark:bg-zinc-400/60 w-1.5 hover:bg-white dark:hover:bg-zinc-300'
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
    <div className={`relative bg-white dark:bg-zinc-900 border-x border-b border-muted dark:border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-none hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] rounded-lg md:rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 h-full flex flex-col group`}>
      {isAdmin && onEdit && onDelete && (
        <div className="absolute top-14 right-2 z-[40] flex flex-col gap-2 transition-all duration-300 opacity-100 translate-x-0 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:translate-x-0 md:translate-x-4">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(product); }}
            className={`bg-primary text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-white/20 dark:border-zinc-700`}
            title="Edit Product"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(product.id); }}
            className="bg-red-500 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-white/20 dark:border-zinc-700"
            title="Delete Product"
          >
            <FaTrash size={14} />
          </button>
        </div>
      )}

      <div className={`w-full h-[3px] shrink-0 ${themeClass}`} />

      {!isAdmin ? (
        <Link href={`${detailPath}${product.id}`}>
          {CardContent}
        </Link>
      ) : (
        CardContent
      )}

      <div className="p-3 max-md:p-2 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-1.5">
          <div className="text-[0.65rem] text-muted-foreground dark:text-zinc-400 uppercase tracking-wider">
            {product.category}
          </div>
        </div>

        <div className="flex flex-col mb-0.5">
          <h3
            className={`text-[0.95rem] max-md:text-[0.75rem] font-bold whitespace-nowrap overflow-hidden text-ellipsis leading-tight text-slate-900 dark:text-zinc-100`}
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        <div className="mt-2 flex flex-col md:flex-row justify-between items-start">
          <div className="flex flex-col justify-start items-start gap-2 mb-2">
            {product.group && (
              <span className="text-[0.65rem] text-muted-foreground dark:text-zinc-400 font-medium italic">
                By {product.group.toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowDescription(true)}
            className={`mb-2 md:mb-0 underline font-semibold text-[11px] md:text-xs text-primary dark:text-primary-400`}
          >
            Description
          </button>
        </div>

        {showDescription && (
          <div
            className="absolute inset-0 bg-background/40 dark:bg-zinc-950/60 backdrop-blur-[3px] z-50 p-2 max-md:p-1 flex items-center justify-center animate-in fade-in duration-200"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDescription(false); }}
          >
            <div
              className="bg-card dark:bg-zinc-900 w-full max-h-[90%] rounded-md shadow-xl border border-border dark:border-zinc-800 p-3 max-md:p-2 flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDescription(false); }}
                className="absolute top-1.5 right-1.5 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted dark:hover:bg-zinc-800 text-foreground dark:text-zinc-300 z-10"
              >
                ✕
              </button>
              <h3 className="text-[0.75rem] font-bold mb-1.5 pr-6 text-foreground dark:text-zinc-100 leading-tight">{product.name}</h3>
              <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                <p className="text-[0.7rem] text-foreground/90 dark:text-zinc-300 whitespace-pre-wrap">{product.description}</p>
              </div>
            </div>
          </div>
        )}

        <div className='flex items-end justify-between mt-auto pt-2'>
          <div className="flex flex-col">
            <span className={`text-lg max-md:text-[0.95rem] font-bold text-slate-900 dark:text-zinc-100`}>
              &#8358;{product.price.toLocaleString()}
            </span>
            {isAdmin && product.costPrice && (
              <span className="text-[11px] md:text-xs font-bold text-black dark:text-zinc-400">
                Cost: &#8358;{product.costPrice.toLocaleString()}
              </span>
            )}
          </div>
          {isAdmin && (
            <div className="flex flex-col">
              <div className={`px-2 py-0.5 rounded-full text-[0.65rem] font-black border transition-colors ${(product.quantity ?? 0) <= 5
                  ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                  : 'bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-400 border-border dark:border-zinc-700'
                }`}>
                Stock: {product.quantity}
              </div>
            </div>
          )}
          {!isAdmin && (
            <button
              disabled={(product.quantity ?? 0) <= 0}
              className={`flex items-center justify-center gap-1.5 rounded md:rounded-md font-bold transition-all duration-200 px-3 py-1.5 max-md:px-2 max-md:py-1 max-md:text-[0.65rem] text-[0.8rem] ${(product.quantity ?? 0) <= 0
                  ? 'bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-500 border border-border dark:border-zinc-700 cursor-not-allowed opacity-50'
                  : `${themeClass} text-white`
                }`}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                // We add to cart treating it like any other product
                const existing = cartItems.find(item => item.id === product.id);
                const currentInCart = existing ? existing.quantity : 0;

                if (currentInCart + 1 > (product.quantity ?? 0)) {
                  toast.error(`Only ${product.quantity ?? 0} available in stock`);
                  return;
                }

                // Construct a mock product to match what useCartStore expects
                addItem({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: safeImgUrl,
                  images: product.images || [safeImgUrl],
                  quantity: product.quantity,
                  category: product.category as any, // type hack
                  description: product.description,
                  productCode: 'N/A',
                  rdpPrice: product.costPrice,
                  manufacturer: product.group,
                  shipping: 0
                });
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