import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LikeState {
  likedProductIds: Record<string, boolean>;
  toggleLike: (productId: string) => void;
  isLiked: (productId: string) => boolean;
}

export const useLikeStore = create<LikeState>()(
  persist(
    (set, get) => ({
      likedProductIds: {},

      toggleLike: (productId) => {
        const currentLikes = { ...get().likedProductIds };
        if (currentLikes[productId]) {
          delete currentLikes[productId];
        } else {
          currentLikes[productId] = true;
        }
        set({ likedProductIds: currentLikes });
      },

      isLiked: (productId) => {
        return !!get().likedProductIds[productId];
      },
    }),
    {
      name: 'user_likes_storage',
    }
  )
);
