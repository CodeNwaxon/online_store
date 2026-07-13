import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/data/products';

interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  selectedMeasurement?: string;
  measurementPrice?: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product & { selectedColor?: string, selectedMeasurement?: string, measurementPrice?: number }) => void;
  removeItem: (productId: string, selectedSize?: string, selectedColor?: string, selectedMeasurement?: string) => void;
  updateQuantity: (productId: string, quantity: number, selectedSize?: string, selectedColor?: string, selectedMeasurement?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(
          (item) => item.id === product.id && item.selectedSize === product.selectedSize && item.selectedColor === product.selectedColor && item.selectedMeasurement === product.selectedMeasurement
        );
        
        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === product.id && item.selectedSize === product.selectedSize && item.selectedColor === product.selectedColor && item.selectedMeasurement === product.selectedMeasurement
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({ items: [...currentItems, { ...product, quantity: 1 }] });
        }
      },
      
      removeItem: (productId, selectedSize, selectedColor, selectedMeasurement) => {
        set({
          items: get().items.filter((item) => !(item.id === productId && item.selectedSize === selectedSize && item.selectedColor === selectedColor && item.selectedMeasurement === selectedMeasurement)),
        });
      },
      
      updateQuantity: (productId, quantity, selectedSize, selectedColor, selectedMeasurement) => {
        if (quantity <= 0) {
          get().removeItem(productId, selectedSize, selectedColor, selectedMeasurement);
          return;
        }
        
        set({
          items: get().items.map((item) =>
            item.id === productId && item.selectedSize === selectedSize && item.selectedColor === selectedColor && item.selectedMeasurement === selectedMeasurement ? { ...item, quantity } : item
          ),
        });
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
