import { create } from 'zustand';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { CategoryProduct } from '@/components/CategoryProductCard';

interface CacheState {
  data: Record<string, CategoryProduct[]>;
  lastFetched: Record<string, number>;
  isLoading: Record<string, boolean>;
  fetchCollection: (collectionName: string, force?: boolean) => Promise<CategoryProduct[]>;
  clearCache: (collectionName?: string) => void;
}

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const useProductCache = create<CacheState>((set, get) => ({
  data: {},
  lastFetched: {},
  isLoading: {},

  fetchCollection: async (collectionName: string, force = false) => {
    const { data, lastFetched, isLoading } = get();

    if (isLoading[collectionName] && !force) {
      return data[collectionName] || [];
    }

    const now = Date.now();
    const isCacheValid = lastFetched[collectionName] && (now - lastFetched[collectionName] < CACHE_DURATION_MS);

    if (!force && isCacheValid && data[collectionName]) {
      return data[collectionName];
    }

    set((state) => ({ isLoading: { ...state.isLoading, [collectionName]: true } }));

    try {
      const q = query(collection(db, collectionName), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CategoryProduct[];

      // Additional explicit sorting to be absolutely sure
      fetchedData.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });

      set((state) => ({
        data: { ...state.data, [collectionName]: fetchedData },
        lastFetched: { ...state.lastFetched, [collectionName]: Date.now() },
        isLoading: { ...state.isLoading, [collectionName]: false }
      }));

      return fetchedData;
    } catch (error) {
      console.error(`Error fetching collection ${collectionName}:`, error);
      set((state) => ({ isLoading: { ...state.isLoading, [collectionName]: false } }));
      return data[collectionName] || [];
    }
  },

  clearCache: (collectionName?: string) => {
    if (collectionName) {
      set((state) => ({
        data: { ...state.data, [collectionName]: [] },
        lastFetched: { ...state.lastFetched, [collectionName]: 0 }
      }));
    } else {
      set({ data: {}, lastFetched: {} });
    }
  }
}));
