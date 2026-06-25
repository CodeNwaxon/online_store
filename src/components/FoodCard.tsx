'use client';

import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaEdit, FaTrash, FaLeaf } from 'react-icons/fa';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface FoodProduct {
  id: string;
  name: string;
  description?: string;
  costPrice: number;
  price: number; // selling price
  images: string[];
  quantity?: number;
  group?: string;
  category?: string;
}

interface FoodCardProps {
  food: FoodProduct;
  isAdmin?: boolean;
  onEdit?: (food: FoodProduct) => void;
  onDelete?: (id: string) => void;
}

export default function FoodCard({ food, isAdmin, onEdit, onDelete }: FoodCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [imgError, setImgError] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const safeImgUrl = imgError || !food.images?.length
    ? '/images/placeholder.png'
    : food.images[currentImgIndex % food.images.length];

  const cycleImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (food.images && food.images.length > 1) {
      setCurrentImgIndex((prev) => (prev + 1) % food.images.length);
    }
  };

  const CardContent = (
    <div className="relative h-48 max-md:h-40 w-full cursor-pointer bg-gradient-to-br from-green-50 to-emerald-100 p-1">
      <div className="relative w-full h-full overflow-hidden rounded-[calc(var(--radius)-2px)]">
        <Image
          src={safeImgUrl}
          alt={food.name}
          fill
          className="object-cover transition-all duration-300 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgError(true)}
        />
        <div
          className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm text-green-600 z-[30] cursor-pointer hover:bg-green-50 transition-colors"
          onClick={cycleImage}
          title="View next image"
        >
          <FaLeaf size={14} />
        </div>
        {(food.quantity ?? 0) <= 0 && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 p-2 text-center select-none">
            <div className="bg-red-600/90 text-white font-black text-[10px] md:text-xs tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg border border-white/20 transform rotate-[-5deg] animate-pulse">
              Out of Stock
            </div>
          </div>
        )}
        {isAdmin && (food.quantity ?? 0) <= 5 && (
          <div className="absolute top-1 right-2 bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black z-[40] shadow-lg border-2 border-white animate-bounce">
            {food.quantity}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative bg-white border border-green-200 shadow-[0_4px_20px_rgba(34,197,94,0.08)] hover:shadow-[0_8px_30px_rgba(34,197,94,0.15)] rounded-lg md:rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 h-full flex flex-col group">
      {isAdmin && onEdit && onDelete && (
        <div className="absolute top-14 right-2 z-[40] flex flex-col gap-2 transition-all duration-300 opacity-100 translate-x-0 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:translate-x-0 md:translate-x-4">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(food); }}
            className="bg-green-600 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-white/20"
            title="Edit Food"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(food.id); }}
            className="bg-red-500 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-white/20"
            title="Delete Food"
          >
            <FaTrash size={14} />
          </button>
        </div>
      )}

      <div className="w-full h-1 shrink-0 bg-gradient-to-r from-green-400 to-emerald-600" />

      {isAdmin ? (
        CardContent
      ) : (
        <Link href={`/foods/${food.id}`}>
          {CardContent}
        </Link>
      )}

      <div className="p-4 max-md:p-3 flex-1 flex flex-col justify-between">
        <div className="mb-2">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-lg max-md:text-base font-bold text-gray-900 leading-tight line-clamp-2">
              {food.name}
            </h3>
          </div>
          {food.description && (
            <button
              onClick={() => setShowDescription(true)}
              className="text-xs text-green-600 font-semibold hover:underline"
            >
              Description
            </button>
          )}
        </div>

        {showDescription && (
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-[3px] z-50 p-2 max-md:p-1 flex items-center justify-center animate-in fade-in duration-200"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDescription(false); }}
          >
            <div
              className="bg-card w-full max-h-[90%] rounded-md shadow-xl border border-border p-3 max-md:p-2 flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDescription(false); }}
                className="absolute top-1.5 right-1.5 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted text-foreground z-10"
              >
                ✕
              </button>
              <h3 className="text-[0.75rem] font-bold mb-1.5 pr-6 text-foreground leading-tight">{food.name}</h3>
              <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                <p className="text-[0.7rem] text-foreground/90 whitespace-pre-wrap">{food.description}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-end justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-xl max-md:text-lg font-black text-emerald-600">
              &#8358;{food.price.toLocaleString()}
            </span>
            {isAdmin && (
              <span className="text-[10px] md:text-xs font-bold text-gray-500">
                Cost: &#8358;{food.costPrice.toLocaleString()}
              </span>
            )}
          </div>

          {isAdmin && (
            <div className="flex flex-col items-end">
              <div className={`px-2 py-0.5 rounded-full text-[0.65rem] font-black border transition-colors ${(food.quantity ?? 0) <= 5
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-muted text-muted-foreground border-border'
                }`}>
                Stock: {food.quantity}
              </div>
            </div>
          )}

          {!isAdmin && (
            (food.quantity ?? 0) <= 0 ? (
              <button
                disabled
                className="flex items-center justify-center gap-2 rounded md:rounded-md font-bold px-4 py-2 max-md:px-3 max-md:py-1.5 text-sm max-md:text-xs bg-gray-400 text-white cursor-not-allowed opacity-50"
              >
                Out of Stock
              </button>
            ) : (
              <button
                className="flex items-center justify-center gap-1 md:gap-2 rounded md:rounded-md font-bold transition-all duration-200 px-4 py-2 max-md:p-1.5 text-sm max-md:text-xs bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Check quantity in cart vs available stock
                  const cartItem = cartItems.find(item => item.id === food.id);
                  const currentInCart = cartItem ? cartItem.quantity : 0;
                  try {
                    const docSnap = await getDoc(doc(db, 'foods', food.id));
                    const liveQty = docSnap.exists() ? (Number(docSnap.data().quantity) || 0) : (food.quantity || 0);
                    if (currentInCart + 1 > liveQty) {
                      toast.error(`Only ${liveQty} available in stock for ${food.name}`, { duration: 3000 });
                      return;
                    }
                  } catch (err) {
                    // If check fails, fallback to local quantity
                    if (currentInCart + 1 > (food.quantity || 0)) {
                      toast.error(`Only ${food.quantity || 0} available in stock for ${food.name}`, { duration: 3000 });
                      return;
                    }
                  }
                  const cartProduct = {
                    id: food.id,
                    name: food.name,
                    price: food.price,
                    image: food.images?.[0] || '/images/placeholder.png',
                    category: 'Food',
                    description: food.description,
                  };
                  addItem(cartProduct as any);
                  toast.success(`${food.name} added to cart`);
                }}
              >
                <FaShoppingCart size={14} /> Buy
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
