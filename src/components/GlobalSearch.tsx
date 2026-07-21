'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FaSearch, FaSpinner } from 'react-icons/fa';
import Link from 'next/link';
import Fuse from 'fuse.js';

interface SearchItem {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  isPromo?: boolean;
  category: string;
  group?: string;
  manufacturer?: string;
}

interface GlobalSearchProps {
  containerBg?: string;
}

const searchSynonyms: Record<string, string[]> = {
  'fridge': ['refrigerator', 'freezer'],
  'refrigerator': ['fridge', 'freezer'],
  'tv': ['television'],
  'television': ['tv'],
  'phone': ['smartphone', 'mobile', 'cellphone'],
  'smartphone': ['phone', 'mobile'],
  'sneakers': ['shoes', 'trainers'],
  'shoes': ['sneakers'],
  'laptop': ['computer', 'pc'],
  'computer': ['laptop', 'pc'],
  'cloths': ['clothes', 'dress', 'clothing', 'apparel'],
  'clothes': ['cloths', 'dress', 'clothing', 'apparel'],
  'dress': ['cloths', 'clothes', 'gown', 'outfit', 'wears'],
  'hair': ['attachment', 'wig', 'weave', 'extensions'],
  'attachment': ['hair', 'wig', 'weave'],
  'furniture': ['chair', 'chairs', 'table', 'sofa', 'desk', 'bed'],
  'chair': ['furniture', 'seat'],
  'chairs': ['furniture', 'seat'],
  'perfume': ['cologne', 'fragrance', 'bodyspray'],
  'pant': ['trousers', 'jeans'],
  'pants': ['trousers', 'jeans'],
  'trousers': ['pants', 'jeans'],
  'earpiece': ['earpods', 'headset', 'headphones', 'earphones'],
  'headset': ['earpods', 'earpiece', 'headphones', 'earphones'],
};

export default function GlobalSearch({ containerBg = 'bg-white' }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(100);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setDisplayLimit(100);

    const search = async () => {
      let itemsToSearch = allItems;

      if (!dataLoaded) {
        setIsLoading(true);
        try {
          const collections = ['products', 'foods', 'cosmetics', 'wears', 'toilet_kitchen'];
          const fetchPromises = collections.map(async (colName) => {
            try {
              const snap = await getDocs(collection(db, colName));
              return snap.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  name: data.name || '',
                  price: data.price || 0,
                  oldPrice: data.oldPrice,
                  image: data.images?.[0] || data.image || '/images/placeholder.png',
                  isPromo: data.isPromo || false,
                  category: colName,
                  group: data.group || '',
                  manufacturer: data.manufacturer || ''
                } as SearchItem;
              });
            } catch (err) {
              console.warn(`Error fetching ${colName}:`, err);
              return [];
            }
          });

          const resultsArray = await Promise.all(fetchPromises);
          itemsToSearch = resultsArray.flat();
          setAllItems(itemsToSearch);
          setDataLoaded(true);
        } catch (error) {
          console.error("Error fetching items for search", error);
        } finally {
          setIsLoading(false);
        }
      }

      const q = query.toLowerCase().trim();
      
      const queryWords = q.split(/\s+/);
      const searchTermsSet = new Set<string>();
      
      searchTermsSet.add(q);
      queryWords.forEach(word => {
        searchTermsSet.add(word);
        if (searchSynonyms[word]) {
          searchSynonyms[word].forEach(syn => searchTermsSet.add(syn));
        }
      });
      
      const expandedQuery = Array.from(searchTermsSet).join(' ');
      
      const fuse = new Fuse(itemsToSearch, {
        keys: ['name', 'category', 'group', 'manufacturer', 'productCode'],
        threshold: 0.3,
        ignoreLocation: true
      });
      
      const results = fuse.search(expandedQuery);
      const filtered = results.map(r => r.item);
      
      setResults(filtered);
      setIsOpen(true);
    };

    const debounceTimer = setTimeout(() => {
      search();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, allItems, dataLoaded]);

  const getUrl = (item: SearchItem) => {
    if (item.category === 'foods') return `/foods/${item.id}`;
    if (item.category === 'cosmetics') return `/shop/cosmetics/${item.id}`;
    if (item.category === 'wears') return `/shop/wears/${item.id}`;
    if (item.category === 'toilet_kitchen') return `/shop/toilet-kitchen/${item.id}`;
    return `/product/${item.id}`;
  };

  return (
    <div className={`w-full ${containerBg} transition-colors duration-700`} ref={dropdownRef}>
      <div className="mx-auto max-w-3xl py-2 px-4 md:px-0 relative w-full">
        <div className="relative flex items-center w-full h-10 rounded-full focus-within:shadow-md bg-white border border-slate-200 overflow-hidden transition-all duration-300 focus-within:border-primary/50 max-md:h-10 py-2">
          <div className="grid place-items-center h-full w-12 text-slate-400">
            {isLoading ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaSearch />
            )}
          </div>
          <input
            className="py-2 peer h-full w-full outline-none text-sm text-slate-700 pr-2 bg-transparent max-md:text-xs"
            type="text"
            id="search"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.trim() && results.length > 0) setIsOpen(true); }}
          />
        </div>

        {/* Dropdown Grid */}
        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 md:right-0 w-[95vw] md:w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[400] max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3">
              <div className="text-xs font-semibold text-slate-400 mb-3 px-1 uppercase tracking-wider">Search Results</div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 md:gap-2">
                {results.slice(0, displayLimit).map((item) => (
                  <Link
                    key={`${item.category}-${item.id}`}
                    href={getUrl(item)}
                    onClick={() => setIsOpen(false)}
                    className="flex flex-col bg-white border border-slate-100 rounded-lg overflow-hidden hover:shadow-md transition-all group"
                  >
                    <div className="relative w-full aspect-square bg-slate-50 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {item.isPromo && (
                        <span className="absolute top-1 left-1 bg-red-600 text-white text-[7px] font-bold px-1 py-0.5 rounded shadow-sm z-10">
                          PROMO
                        </span>
                      )}
                    </div>
                    <div className="p-1.5 flex flex-col flex-1">
                      <h4 className="text-[9px] md:text-[10px] font-medium text-slate-800 line-clamp-2 mb-1 leading-tight flex-1">
                        {item.name}
                      </h4>
                      <div className="flex items-end gap-1 flex-wrap mt-auto">
                        <span className="text-[9px] md:text-[10px] font-bold text-primary">₦{item.price?.toLocaleString()}</span>
                        {item.isPromo && item.oldPrice && (
                          <span className="text-[7px] text-slate-400 line-through">₦{item.oldPrice?.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {results.length > displayLimit && (
                <div className="mt-6 mb-2 flex justify-center">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setDisplayLimit(prev => prev + 100);
                    }}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-colors shadow-sm"
                  >
                    Load More Results
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isOpen && query.trim() && results.length === 0 && !isLoading && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[400] p-8 text-center animate-in fade-in duration-200">
            <div className="text-slate-400 mb-2 flex justify-center"><FaSearch size={24} /></div>
            <p className="text-slate-600 font-medium text-sm">No results found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
