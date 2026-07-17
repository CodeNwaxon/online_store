'use client';

import { useState, useEffect, Suspense } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaPlus, FaTrash, FaEdit, FaImage, FaLink, FaTimes, FaSearch, FaBox, FaCheck, FaStar, FaSave, FaChevronDown } from 'react-icons/fa';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';
import SearchableSelect from '@/components/SearchableSelect';
import { useSearchParams, useRouter } from 'next/navigation';
import DistributionManager from '@/components/DistributionManager';
import { uploadImageToCloudinary } from '@/actions/upload';
import { useAdmin } from '@/hooks/useAdmin';
import VendorSalesHistory from '@/components/VendorSalesHistory';

const formatName = (str: string) => {
  return str.trim().replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const formatStructure = (str: string) => {
  if (!str) return '';
  return str.trim().split(/\s+/).join(' ').toUpperCase();
};

const findSimilarGroup = (newName: string, existingGroups: string[]): string | null => {
  const normalize = (s: string) => s.toLowerCase().trim();
  const stem = (s: string) => {
    const n = normalize(s);
    if (n.endsWith('ies')) return n.slice(0, -3) + 'y';
    if (n.endsWith('es')) return n.slice(0, -2);
    if (n.endsWith('s') && !n.endsWith('ss')) return n.slice(0, -1);
    return n;
  };
  const newStem = stem(newName);
  for (const g of existingGroups) {
    if (normalize(g) === normalize(newName)) return g;
    if (stem(g) === newStem) return g;
  }
  return null;
};

const formatPriceInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat().format(parseInt(digits));
};

const parsePriceInput = (value: string) => {
  return value.replace(/\D/g, "");
};

const parseDate = (dateVal: any) => {
  if (!dateVal) return 0;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
  return new Date(dateVal).getTime() || 0;
};


function AdminProductsContent() {
  const { user, isCEO, adminData } = useAdmin();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editParam = searchParams.get('edit');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Hero Slides State
  const [heroSlides, setHeroSlides] = useState<string[]>([]);
  const [heroSaving, setHeroSaving] = useState(false);
  const [isHeroExpanded, setIsHeroExpanded] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [group, setGroup] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isPromo, setIsPromo] = useState(false);
  const [oldPrice, setOldPrice] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [warranty, setWarranty] = useState('');
  const [rdpPrice, setRdpPrice] = useState('');
  const [productCode, setProductCode] = useState('');
  const [size, setSize] = useState('');
  const [ramRom, setRamRom] = useState('');
  const [isCustomShipping, setIsCustomShipping] = useState(false);
  const [customShippingAmount, setCustomShippingAmount] = useState('');

  // Image State
  const [images, setImages] = useState<{ type: 'file' | 'url', value: string | File }[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [visibleCount, setVisibleCount] = useState(60);

  // Size shipping prices
  const [sizePrices, setSizePrices] = useState<Record<string, string>>({});

  // Meta lists
  const [groups, setGroups] = useState<string[]>(['ELECTRONICS', 'FURNITURE']);
  const [categoriesByGroup, setCategoriesByGroup] = useState<Record<string, string[]>>({
    'ELECTRONICS': ['TV', 'FRIDGE', 'WASHING MACHINES', 'FANS', 'OVENS', 'GENERATORS', 'INVERTER AIRCONS', 'SOLAR POWER BANKS'],
    'FURNITURE': ['DINING SETS', 'SOFAS', 'TABLES'],
  });

  // UI state for adding new entries
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Delete confirmation state
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Distribution Manager State
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);

  useEffect(() => {
    const unsub2 = onSnapshot(collection(db, 'distribution_areas'), (snap) => {
      const areas = snap.docs.map(d => d.data());
      if (areas.length > 0) {
        const priceStrings: Record<string, string> = {};
        const sizes = ['extra-large', 'large', 'medium', 'small', 'extra-small', 'extra-extra-small'];
        sizes.forEach(s => {
          const vals = areas.map(a => (a.prices?.[s] || 0) as number).filter(v => v > 0);
          const uniqueVals = Array.from(new Set(vals)).sort((a, b) => b - a);
          if (uniqueVals.length === 0) {
            priceStrings[s] = '';
          } else if (uniqueVals.length === 1) {
            priceStrings[s] = `₦${uniqueVals[0].toLocaleString()}`;
          } else {
            const highest = uniqueVals[0];
            const rest = uniqueVals.slice(1).map(v => `₦${v.toLocaleString()}`).join(', ');
            priceStrings[s] = `₦${highest.toLocaleString()} (${rest})`;
          }
        });
        setSizePrices(priceStrings);
      }
    });
    return () => unsub2();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), async (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      // Auto-remove expired promos
      const now = new Date();
      const expiredPromos = prods.filter((p: any) =>
        p.isPromo &&
        p.promoEndDate &&
        new Date(p.promoEndDate) < now
      );

      if (expiredPromos.length > 0) {
        for (const promo of expiredPromos) {
          try {
            await updateDoc(doc(db, 'products', promo.id), {
              isPromo: false,
              promoEndDate: null,
              updatedAt: now.toISOString()
            });
          } catch (err) {
            console.error("Error auto-removing promo:", err);
          }
        }
        // The snapshot listener will trigger again after updates
        return;
      }

      // Sort products by updatedAt descending (newest/most recently edited first)
      const sortedProds = [...prods].sort((a, b) => {
        const dateA = parseDate(a.updatedAt);
        const dateB = parseDate(b.updatedAt);
        return dateB - dateA;
      });

      setProducts(sortedProds);

      // Dynamically extract groups and categories from products to stay updated
      const newMap: Record<string, string[]> = { ...categoriesByGroup };
      const uniqueGroups = Array.from(new Set(prods.map((p: any) => p.group))).filter(Boolean);

      uniqueGroups.forEach((g: any) => {
        const groupUpper = g.toUpperCase();
        if (!newMap[groupUpper]) newMap[groupUpper] = [];
        const catsForGroup = Array.from(new Set(prods.filter((p: any) => p.group.toUpperCase() === groupUpper).map((p: any) => p.category.toUpperCase()))).filter(Boolean);
        newMap[groupUpper] = Array.from(new Set([...newMap[groupUpper], ...catsForGroup as string[]]));
      });

      setGroups(prev => Array.from(new Set([...prev, ...uniqueGroups.map((g: any) => formatStructure(g))])).sort());
      setCategoriesByGroup(newMap);
    }, (error) => {
      console.warn("Products listener error:", error);
    });

    return () => unsub();
  }, []);

  // Handle auto-edit from query parameter
  useEffect(() => {
    if (editParam && products.length > 0) {
      const productToEdit = products.find(p => p.id === editParam);
      if (productToEdit && editingId !== editParam) {
        handleEdit(productToEdit);
      }
    }
  }, [editParam, products, editingId]);

  // Load hero slides from Firestore
  useEffect(() => {
    const loadHero = async () => {
      const snap = await getDoc(doc(db, 'settings', 'hero'));
      if (snap.exists()) setHeroSlides(snap.data().productIds || []);
    };
    loadHero();
  }, []);

  const handleToggleHero = (productId: string) => {
    if (heroSlides.includes(productId)) {
      setHeroSlides(heroSlides.filter(id => id !== productId));
    } else {
      if (heroSlides.length >= 12) {
        toast.error('Maximum 12 hero slides allowed.');
        return;
      }
      setHeroSlides([...heroSlides, productId]);
    }
  };

  const handleSaveHero = async () => {
    setHeroSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'hero'), { productIds: heroSlides });
      toast.success('Hero slides saved!');
    } catch {
      toast.error('Failed to save hero slides.');
    } finally {
      setHeroSaving(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput) return;

    try {
      new URL(imageUrlInput);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    if (images.length >= 4) {
      toast.error('Maximum 4 images allowed');
      return;
    }
    setImages([...images, { type: 'url', value: imageUrlInput }]);
    setImageUrlInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 4) {
      toast.error('Maximum 4 images allowed');
      return;
    }

    const newImages = Array.from(files).map(file => ({ type: 'file' as const, value: file }));
    setImages([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setDescription('');
    setGroup('');
    setCategory('');
    setQuantity('1');
    setOldPrice('');
    setImages([]);
    setPromoEndDate('');
    setManufacturer('');
    setWarranty('');
    setRdpPrice('');
    setProductCode('');
    setSize('');
    setRamRom('');
    setIsAddingGroup(false);
    setIsAddingCategory(false);
    setNewGroupName('');
    setNewCategoryName('');
    setImageUrlInput('');
    setIsCustomShipping(false);
    setCustomShippingAmount('');
  };

  const handleCancel = () => {
    if (editParam) {
      router.push('/admin/stats?tab=inventory');
    } else {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic required field validation
    if (!name.trim()) {
      toast.error('Product name is required.');
      return;
    }
    if (!group) {
      toast.error('Please select a group.');
      return;
    }
    if (!category) {
      toast.error('Please select a category.');
      return;
    }
    if (!price.trim()) {
      toast.error('Sales price is required.');
      return;
    }
    if (!rdpPrice.trim()) {
      toast.error('RDP price (Cost Price) is required.');
      return;
    }
    if (!size && !isCustomShipping) {
      toast.error('Please select a product size.');
      return;
    }

    // Duplicate product code check
    const isCodeDuplicate = productCode.trim() !== '' && products.some(p =>
      p.id !== editingId &&
      p.productCode &&
      p.productCode.trim().toUpperCase() === productCode.trim().toUpperCase()
    );
    if (isCodeDuplicate) {
      toast.error('This product code has already been added to another product.');
      return;
    }

    // Price relationship validation
    const parsedRdp = parseFloat(rdpPrice.replace(/,/g, '')) || 0;
    const parsedPrice = parseFloat(price.replace(/,/g, '')) || 0;
    if (parsedRdp >= parsedPrice) {
      toast.error('RDP Price (Cost Price) cannot be higher or equal to Sales Price (Selling Price).');
      return;
    }



    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload files to Cloudinary
      const uploadedUrls = await Promise.all(images.map(async (img) => {
        if (img.type === 'url') return img.value as string;

        const formData = new FormData();
        formData.append('file', img.value);
        const data = await uploadImageToCloudinary(formData);
        return data.secure_url;
      }));

      const productData = {
        name: formatName(name),
        price: isPromo ? Number(parsePriceInput(oldPrice)) : Number(parsePriceInput(price)),
        rdpPrice: Number(parsePriceInput(rdpPrice)) || 0,
        productCode: productCode.trim().toUpperCase(),
        description,
        group: formatStructure(group),
        category: formatStructure(category),
        quantity: Number(quantity),
        isPromo,
        oldPrice: isPromo ? Number(parsePriceInput(price)) : null,
        promoEndDate: isPromo && promoEndDate ? promoEndDate : null,
        size: size || 'medium',
        customShippingAmount: isCustomShipping && customShippingAmount ? Number(parsePriceInput(customShippingAmount)) : null,
        ramRom: ramRom.trim() || '',
        images: uploadedUrls,
        image: uploadedUrls[0], // Main image
        manufacturer: manufacturer.trim() || 'Unknown',
        warranty: warranty.trim() || '',
        updatedAt: new Date().toISOString(),
        vendor: user?.email || '',
      };


      if (editingId) {
        const existingProduct = products.find(p => p.id === editingId);
        const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/PRODUCTS'));
        if (!hasFullAccess && existingProduct && existingProduct.vendor && existingProduct.vendor !== user?.email) {
          toast.error('You can only edit your own items.');
          setLoading(false);
          return;
        }
        await updateDoc(doc(db, 'products', editingId), productData);
        toast.success('Product updated!');
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success('Product added!');
      }
      if (editParam) {
        router.push('/admin/stats?tab=inventory');
      } else {
        resetForm();
      }
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || '';
      if (msg.includes('upload') || msg.includes('Cloudinary') || msg.includes('fetch')) {
        toast.error('Image upload failed. Try using smaller images or image URLs instead.');
      } else {
        toast.error('Operation failed. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: any) => {
        const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/PRODUCTS'));
        if (!hasFullAccess && product.vendor && product.vendor !== user?.email) {
          toast.error('You can only edit your own items.');
          return;
        }
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description);
    setGroup(product.group);
    setCategory(product.category);
    setQuantity(product.quantity.toString());
    setIsPromo(product.isPromo || false);
    // If promo: form's `price` = original price (product.oldPrice), form's `oldPrice` = promo price (product.price)
    // If not promo: form's `price` = selling price (product.price)
    setPrice(product.isPromo ? formatPriceInput((product.oldPrice || 0).toString()) : formatPriceInput(product.price.toString()));
    setOldPrice(product.isPromo ? formatPriceInput(product.price.toString()) : '');
    setPromoEndDate(product.promoEndDate || '');
    setManufacturer(product.manufacturer || '');
    setWarranty(product.warranty || '');
    setRdpPrice(product.rdpPrice ? formatPriceInput(product.rdpPrice.toString()) : '');
    setProductCode(product.productCode || '');
    setSize(product.size || '');
    setIsCustomShipping(!!product.customShippingAmount);
    setCustomShippingAmount(product.customShippingAmount ? formatPriceInput(product.customShippingAmount.toString()) : '');
    setRamRom(product.ramRom || '');
    setImages(product.images.map((url: string) => ({ type: 'url', value: url })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
        const existingProduct = products.find(p => p.id === productToDelete);
        const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/PRODUCTS'));
        if (!hasFullAccess && existingProduct && existingProduct.vendor && existingProduct.vendor !== user?.email) {
          toast.error('You can only delete your own items.');
          setProductToDelete(null);
          return;
        }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'products', productToDelete));
      toast.success('Product deleted.');
    } catch (error) {
      toast.error('Failed to delete.');
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/PRODUCTS'));
  const visibleProducts = hasFullAccess ? products : products.filter(p => p.vendor === user?.email);

  const filteredProducts = visibleProducts.filter(p => {
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) {
      const matchesGroup = filterGroup === 'All' || p.group === filterGroup;
      return matchesGroup;
    }

    const normalize = (str: string) => {
      if (!str) return '';
      return str.toLowerCase()
        .replace(/sh/g, 'ch')
        .replace(/s/g, 'c')
        .replace(/ph/g, 'f')
        .replace(/k/g, 'c')
        .replace(/\s/g, '');
    };

    const matchesSearch = searchTerms.every(term => {
      const normTerm = normalize(term);
      const checkField = (fieldVal: string) => {
        if (!fieldVal) return false;
        const lowerVal = fieldVal.toLowerCase();
        const normVal = normalize(fieldVal);
        return lowerVal.includes(term) || normVal.includes(normTerm);
      };

      return (
        checkField(p.name) ||
        checkField(p.group) ||
        checkField(p.category) ||
        checkField(p.manufacturer)
      );
    });

    const matchesGroup = filterGroup === 'All' || p.group === filterGroup;
    return matchesSearch && matchesGroup;
  }).sort((a, b) => parseDate(b.updatedAt) - parseDate(a.updatedAt));

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  return (
    <div className="space-y-8 md:space-y-12">
      <header className="px-4 md:px-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Product Management</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage your store inventory and promos.</p>
        </div>
        <div className="flex gap-3 items-center w-full md:w-auto">
          {isCEO && (
            <button
              onClick={() => setIsDistributionOpen(true)}
              className="bg-secondary text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-secondary/90 transition-colors"
            >
              Distribution fee
            </button>
          )}
        </div>
      </header>

      <DistributionManager isOpen={isDistributionOpen} onClose={() => setIsDistributionOpen(false)} />

      {/* PRODUCT FORM */}
      <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
        <h2 className="text-lg md:text-xl font-bold mb-6">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold">Product Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} type="text" placeholder="e.g. Samsung 55-inch Smart TV" className="w-full p-3 rounded-md border border-border bg-background text-sm" />
            </div>

            {/* Manufacturer */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold">Manufacturer</label>
              <input
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                type="text"
                placeholder="e.g. Samsung, LG, Nexus..."
                className="w-full p-3 rounded-md border border-border bg-background text-sm"
              />
            </div>

            {/* Warranty */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold">Warranty</label>
              <input
                value={warranty}
                onChange={e => setWarranty(e.target.value)}
                type="text"
                placeholder="e.g. 1 Year, 6 Months, No Warranty"
                className="w-full p-3 rounded-md border border-border bg-background text-sm"
              />
              <p className="text-[0.65rem] text-muted-foreground">Warranty period or terms for this product.</p>
            </div>

            {/* Product Code */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold text-teal-600 flex justify-between items-center">
                Product Code
                {productCode.trim() !== '' && products.some(p => p.id !== editingId && p.productCode && p.productCode.trim().toUpperCase() === productCode.trim().toUpperCase()) && (
                  <span className="text-[10px] text-red-500 font-bold animate-pulse">⚠️ Code already added</span>
                )}
              </label>
              <input
                required
                value={productCode}
                onChange={e => setProductCode(e.target.value)}
                type="text"
                placeholder="e.g. ELEC-AC-001"
                className={`w-full p-3 rounded-md border bg-background text-sm outline-none transition-all font-bold ${productCode.trim() !== '' && products.some(p => p.id !== editingId && p.productCode && p.productCode.trim().toUpperCase() === productCode.trim().toUpperCase())
                  ? 'border-red-500 focus:border-red-600 ring-2 ring-red-100'
                  : 'border-teal-300 focus:border-teal-500'
                  }`}
              />
            </div>

            {/* RDP Price (Cost Price) */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold text-red-700">RDP Price (Cost Price) (₦)</label>
              <input
                required
                value={rdpPrice}
                onChange={e => setRdpPrice(formatPriceInput(e.target.value))}
                type="text"
                placeholder="e.g. 40,000"
                className="w-full p-3 rounded-md border border-red-300 bg-background text-sm focus:border-red-500 outline-none transition-all font-bold"
              />
            </div>

            {/* Sales Price (Selling Price) */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold text-primary flex justify-between items-center">
                <span>Sales Price (Selling Price) (₦)</span>
                {rdpPrice.trim() !== '' && price.trim() !== '' && (parseFloat(rdpPrice.replace(/,/g, '')) || 0) > (parseFloat(price.replace(/,/g, '')) || 0) && (
                  <span className="text-[10px] text-red-500 font-bold animate-pulse">⚠️ RDP Price cannot be higher than Sales Price</span>
                )}
              </label>
              <input
                required
                value={price}
                onChange={e => setPrice(formatPriceInput(e.target.value))}
                type="text"
                placeholder="e.g. 50,000"
                className={`w-full p-3 rounded-md border bg-background text-sm outline-none transition-all font-bold ${rdpPrice.trim() !== '' && price.trim() !== '' && (parseFloat(rdpPrice.replace(/,/g, '')) || 0) > (parseFloat(price.replace(/,/g, '')) || 0)
                  ? 'border-red-500 focus:border-red-600 ring-2 ring-red-100'
                  : 'border-primary/30 focus:border-primary'
                  }`}
              />
            </div>

            {/* Group */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex justify-between items-center">
                Group
                <button type="button" onClick={() => setIsAddingGroup(!isAddingGroup)} className="text-primary text-[0.7rem] flex items-center gap-1 hover:underline">
                  <FaPlus size={10} /> {isAddingGroup ? 'Cancel' : 'Add New'}
                </button>
              </label>
              {isAddingGroup ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    placeholder="Type new group name..."
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    className="flex-1 p-3 rounded-md border border-primary bg-primary/5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newGroupName) {
                        const formatted = formatStructure(newGroupName);
                        const existing = findSimilarGroup(formatted, groups);
                        if (existing) {
                          toast.error(`"${formatted}" is too similar to existing group "${existing}". Please use "${existing}" instead.`);
                          return;
                        }
                        setGroup(formatted); setGroups(prev => Array.from(new Set([...prev, formatted])).sort()); setIsAddingGroup(false);
                      }
                    }}
                    className="bg-primary text-white px-4 rounded-md text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <SearchableSelect
                  required
                  value={group}
                  onChange={(val) => { setGroup(val); setCategory(''); }}
                  options={groups}
                  placeholder="Select Group"
                />
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex justify-between items-center">
                Category
                <button
                  type="button"
                  disabled={!group}
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-primary text-[0.7rem] flex items-center gap-1 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  <FaPlus size={10} /> {isAddingCategory ? 'Cancel' : 'Add New'}
                </button>
              </label>
              {isAddingCategory ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    placeholder="Type new category..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="flex-1 p-3 rounded-md border border-primary bg-primary/5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCategoryName && group) {
                        const formatted = formatStructure(newCategoryName);
                        setCategory(formatted);
                        setCategoriesByGroup({ ...categoriesByGroup, [group]: [...(categoriesByGroup[group] || []), formatted] });
                        setIsAddingCategory(false);
                      }
                    }}
                    className="bg-primary text-white px-4 rounded-md text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <SearchableSelect
                  required
                  disabled={!group}
                  value={category}
                  onChange={(val) => setCategory(val)}
                  options={group ? (categoriesByGroup[group] || []) : []}
                  placeholder={group ? 'Select Category' : 'Choose Group First'}
                />
              )}
            </div>

            {/* RAM & ROM */}
            {group && (group.toUpperCase().includes('PHONE') || group.toUpperCase().includes('PHONES') || group.toUpperCase().includes('LAPTOP') || group.toUpperCase().includes('LAPTOPS')) && (
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-bold">RAM & ROM (Optional)</label>
                <input
                  value={ramRom}
                  onChange={e => setRamRom(e.target.value)}
                  type="text"
                  placeholder="e.g. 8/256"
                  className="w-full p-3 rounded-md border border-border bg-background text-sm"
                />
              </div>
            )}

            {/* Product Size */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold">Product Size</label>
              <select required value={isCustomShipping ? 'custom' : size} onChange={e => {
                if (e.target.value === 'custom') {
                  setIsCustomShipping(true);
                  setSize('');
                } else {
                  setIsCustomShipping(false);
                  setSize(e.target.value);
                }
              }} className="w-full p-3 rounded-md border border-border bg-background text-[11px] md:text-sm">
                <option value="">Select Size</option>
                <option value="extra-large">Extra Large {sizePrices['extra-large'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['extra-large']}` : ''}</option>
                <option value="large">Large {sizePrices['large'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['large']}` : ''}</option>
                <option value="medium">Medium {sizePrices['medium'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['medium']}` : ''}</option>
                <option value="small">Small {sizePrices['small'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['small']}` : ''}</option>
                <option value="extra-small">Extra Small {sizePrices['extra-small'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['extra-small']}` : ''}</option>
                <option value="extra-extra-small">Extra Extra Small {sizePrices['extra-extra-small'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['extra-extra-small']}` : ''}</option>
                <option value="custom" className="text-primary font-bold">Customise Shipping Amount</option>
              </select>
              {isCustomShipping && (
                 <div className="mt-2 animate-[slideIn_0.2s_ease]">
                    <label className="text-[0.65rem] font-bold text-secondary mb-1 block uppercase">Custom Shipping Amount (₦)</label>
                    <input
                      type="text"
                      required={isCustomShipping}
                      value={customShippingAmount}
                      onChange={(e) => setCustomShippingAmount(formatPriceInput(e.target.value))}
                      placeholder="e.g. 5,000"
                      className="w-full p-2 rounded-md border border-secondary/50 bg-background text-sm focus:border-secondary outline-none transition-all font-bold"
                    />
                 </div>
              )}
            </div>

            {/* Promotion */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold">Promotion</label>
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                  <input type="checkbox" checked={isPromo} onChange={e => setIsPromo(e.target.checked)} className="size-4" />
                  Is Promo?
                </label>
              </div>
              {isPromo && (
                <div className="flex flex-col gap-4 animate-[slideIn_0.2s_ease] mt-2">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[0.65rem] font-bold block mb-1 text-muted-foreground uppercase">Original Price</label>
                      <input readOnly value={price} type="text" className="w-full p-2 rounded-md border border-border bg-muted text-sm opacity-70" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[0.65rem] font-bold block mb-1 text-primary uppercase">Promo Price (₦)</label>
                      <input
                        required
                        value={oldPrice}
                        onChange={e => setOldPrice(formatPriceInput(e.target.value))}
                        type="text"
                        placeholder="e.g. 45,000"
                        className="w-full p-2 rounded-md border border-primary bg-background text-sm font-bold focus:ring-2 ring-primary/20 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[0.65rem] font-bold block mb-1 text-secondary uppercase">Promo End Date (Optional)</label>
                    <input
                      type="date"
                      value={promoEndDate}
                      onChange={e => setPromoEndDate(e.target.value)}
                      className="w-full p-2 rounded-md border border-border bg-background text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs md:text-sm font-bold">Description</label>
            <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. This 55-inch Samsung Smart TV features 4K UHD resolution, built-in Wi-Fi, and access to Netflix, YouTube and more. Perfect for home entertainment." className="w-full p-3 rounded-md border border-border bg-background text-sm" />
          </div>


          <div className="space-y-4">
            <label className="text-xs md:text-sm font-bold">Product Images (Min 1, Max 4)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste Image URL..."
                    className="flex-1 p-3 rounded-md border border-border bg-background text-xs"
                    value={imageUrlInput}
                    onChange={e => setImageUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddImageUrl();
                      }
                    }}
                  />
                  <button type="button" onClick={handleAddImageUrl} className="bg-primary text-white p-3 rounded-md hover:bg-primary-hover shadow-sm transition-colors">
                    <FaPlus />
                  </button>
                </div>
                {imageUrlInput && (
                  <div className="mt-1 h-12 w-20 rounded border border-border overflow-hidden bg-muted animate-in fade-in slide-in-from-top-1">
                    <img
                      src={imageUrlInput}
                      alt="Live Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                    />
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="flex items-center justify-center gap-2 p-3 rounded-md border border-dashed border-primary bg-primary/5 text-primary font-bold cursor-pointer hover:bg-primary/10 transition-colors text-sm">
                  <FaImage /> Upload Files
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            </div>

            {/* PREVIEW */}
            <div className="flex flex-wrap gap-4 mt-4">
              {images.map((img, i) => (
                <div key={i} className="relative w-24 h-24 rounded-md overflow-hidden border border-border group bg-muted">
                  {/* Use standard img for preview to avoid Next.js Image component hostname restriction crashes in admin */}
                  <img
                    src={img.type === 'url' ? (img.value as string) : URL.createObjectURL(img.value as File)}
                    alt="preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Invalid+Image';
                      toast.error('One of your images failed to load.');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity z-10"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* QUANTITY MOVED HERE */}
            <div className="pt-4 border-t border-border mt-4">
              <div className="max-w-[200px] space-y-2">
                <label className="text-xs md:text-sm font-bold text-primary">Quantity In Stock</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, Number(quantity) - 1).toString())}
                    className="size-10 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors font-bold"
                  >
                    -
                  </button>
                  <input
                    required
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    type="number"
                    min="1"
                    className="w-20 p-2 rounded-md border border-border bg-background text-sm text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((Number(quantity) + 1).toString())}
                    className="size-10 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 bg-primary text-white py-4 rounded-md font-bold flex items-center justify-center gap-2 text-sm transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary-hover'}`}
            >
              {loading ? 'Processing...' : (editingId ? 'Update Product' : 'Add Product')}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancel} className="bg-muted px-8 py-4 rounded-md font-bold border border-border text-sm">Cancel</button>
            )}
          </div>
        </form>
      </section>

      {/* HOME HERO SLIDES */}
      <section className="bg-card md:rounded-[var(--radius)] border border-border shadow-sm overflow-hidden">
        <div className="p-4 md:p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 cursor-pointer group/title" onClick={() => setIsHeroExpanded(!isHeroExpanded)}>
            <div className="flex flex-col">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <FaStar className="text-primary" /> Home Hero Slides
                <FaChevronDown className={`transition-transform duration-300 text-muted-foreground ${isHeroExpanded ? 'rotate-180' : ''}`} size={16} />
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Select up to 12 products to feature on the home page carousel. <span className="font-bold text-primary">{heroSlides.length}/12 selected</span></p>
            </div>
          </div>
          <button
            onClick={handleSaveHero}
            disabled={heroSaving}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-md font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 shrink-0"
          >
            <FaSave />
            {heroSaving ? 'Saving...' : 'Save Hero Slides'}
          </button>
        </div>

        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isHeroExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="p-4 md:p-8 border-t border-border/50 bg-muted/5">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FaBox className="text-muted-foreground mb-4" size={40} />
                <p className="text-muted-foreground font-bold">No products found</p>
                <p className="text-xs text-muted-foreground mt-1">Add products above to select them for the hero carousel.</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 pb-4">
                  {products.map(product => {
                    const isSelected = heroSlides.includes(product.id);
                    const selectionIndex = heroSlides.indexOf(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleToggleHero(product.id)}
                        className={`relative rounded-[var(--radius)] border-2 overflow-hidden transition-all text-left group ${isSelected
                          ? 'border-primary shadow-lg shadow-primary/20'
                          : 'border-border hover:border-primary/50'
                          }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative aspect-square bg-muted">
                          {product.image && (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 12vw"
                            />
                          )}
                          {/* Selection badge */}
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow">
                              {selectionIndex + 1}
                            </div>
                          )}
                          {/* Overlay */}
                          <div className={`absolute inset-0 flex items-center justify-center transition-all ${isSelected ? 'bg-primary/10' : 'bg-black/0 group-hover:bg-black/5'
                            }`}>
                            {isSelected && (
                              <div className="bg-primary text-white rounded-full p-1.5">
                                <FaCheck size={12} />
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Info */}
                        <div className="p-1.5 bg-background">
                          <p className="text-[10px] font-bold truncate leading-tight">{product.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate leading-tight">{product.category}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRODUCT LIST & FILTERS */}
      <section className="space-y-6 md:space-y-8 px-4 md:px-0 pt-16 border-t border-border/50">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <h2 className="text-xl md:text-2xl font-bold">Existing Products ({filteredProducts.length})</h2>
              <VendorSalesHistory userEmail={user?.email || null} isCEO={isCEO} inventoryCollection="products" allowAll />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-3 text-muted-foreground size-3" />
            </div>
            <select
              className="w-full sm:w-auto p-2 rounded-md border border-border bg-background text-sm"
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
            >
              <option value="All">All Groups</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {displayedProducts.map(product => (
            <div key={product.id} className="relative group bg-card rounded-[var(--radius)] h-full flex flex-col">
              <div className="relative flex-1 flex flex-col">
                <ProductCard product={product} isAdmin={true} onEdit={handleEdit} onDelete={handleDelete} />
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length > visibleCount && (
          <div className="text-center mt-12 flex flex-col items-center justify-center gap-4 animate-[fadeIn_0.5s_ease-out]">
            <div className="text-xs text-muted-foreground font-medium tracking-wide">
              Showing {displayedProducts.length} of {filteredProducts.length} items
            </div>
            <button
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-border bg-background hover:bg-muted text-foreground hover:text-primary px-4 py-2 text-xs md:text-sm font-bold tracking-wider uppercase shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md active:scale-95 active:shadow-sm"
              onClick={() => setVisibleCount(prev => prev + 40)}
            >
              <span className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span>Load More Products</span>
              <FaChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-y-0.5 transition-all duration-300 ease-out" />
            </button>
          </div>
        )}
      </section>

      {/* DELETE CONFIRMATION OVERLAY */}
      {productToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-[var(--radius)] border border-border shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="bg-red-100 text-red-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTrash size={20} />
              </div>
              <h3 className="text-xl font-bold">Delete Product?</h3>
              <p className="text-sm text-muted-foreground">This action cannot be undone. The product will be permanently removed from your store.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                disabled={isDeleting}
                onClick={confirmDelete}
                className={`w-full bg-red-600 text-white py-3 rounded-md font-bold transition-colors ${isDeleting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'}`}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setProductToDelete(null)}
                className="w-full bg-muted hover:bg-muted/80 text-foreground py-3 rounded-md font-bold transition-colors border border-border"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProducts() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <AdminProductsContent />
    </Suspense>
  );
}
