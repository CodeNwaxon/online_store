'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaPlus, FaTrash, FaEdit, FaImage, FaTimes, FaSearch, FaBoxes } from 'react-icons/fa';
import AdminGuard from '@/components/AdminGuard';
import { uploadImageToCloudinary } from '@/actions/upload';
import ShopCard, { ShopProduct } from '@/components/ShopCard';
import SearchableSelect from '@/components/SearchableSelect';
import VendorSalesHistory from '@/components/VendorSalesHistory';
import { useAdmin } from '@/hooks/useAdmin';
import Fuse from 'fuse.js';


const formatPriceInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat().format(parseInt(digits));
};

const parsePriceInput = (value: string) => {
  return value.replace(/\D/g, "");
};

export default function AdminToiletKitchen() {
  const { user, isCEO, adminData } = useAdmin();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [group, setGroup] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [size, setSize] = useState('');
  const [isCustomShipping, setIsCustomShipping] = useState(false);
  const [customShippingAmount, setCustomShippingAmount] = useState('');
  const [requiresMinShipping, setRequiresMinShipping] = useState(false);
  const [minShippingQty, setMinShippingQty] = useState('0');

  // Dynamic Groups & Categories State
  const [groups, setGroups] = useState<string[]>([]);
  const [categoriesByGroup, setCategoriesByGroup] = useState<Record<string, string[]>>({});
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const formatStructure = (str: string) => {
    if (!str) return '';
    return str.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
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

  // Image State
  const [images, setImages] = useState<{ type: 'file' | 'url', value: string | File }[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');

  // Size shipping prices
  const [sizePrices, setSizePrices] = useState<Record<string, string>>({});

  // Delete state
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    const q = query(collection(db, 'toilet_kitchen'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShopProduct[];
      
      const sortedProds = [...prods].sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setProducts(sortedProds);

      // Extract unique groups and categories
      const uniqueGroups = Array.from(new Set(sortedProds.map(p => p.group).filter(Boolean)));
      const newMap: Record<string, string[]> = {};

      uniqueGroups.forEach((g: any) => {
        const groupUpper = g.toUpperCase();
        if (!newMap[groupUpper]) newMap[groupUpper] = [];
        const catsForGroup = Array.from(new Set(sortedProds.filter(p => p.group && p.group.toUpperCase() === groupUpper).map(p => p.category))).filter(Boolean);
        newMap[groupUpper] = Array.from(new Set([...newMap[groupUpper], ...catsForGroup as string[]]));
      });

      setGroups(prev => Array.from(new Set([...prev, ...uniqueGroups.map((g: any) => formatStructure(g))])).sort());
      setCategoriesByGroup(newMap);

    }, (error) => {
      console.warn("ToiletKitchen listener error:", error);
    });
    return () => unsub();
  }, []);

  const handleAddImageUrl = () => {
    if (!imageUrlInput) return;
    try { new URL(imageUrlInput); } catch {
      toast.error('Please enter a valid URL');
      return;
    }
    if (images.length >= 3) {
      toast.error('Maximum 3 images allowed');
      return;
    }
    setImages([...images, { type: 'url', value: imageUrlInput }]);
    setImageUrlInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (images.length + files.length > 3) {
      toast.error('Maximum 3 images allowed');
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
    setCostPrice('');
    setPrice('');
    setDescription('');
    setGroup('');
    setCategory('');
    setQuantity('1');
    setSize('');
    setIsAddingGroup(false);
    setIsAddingCategory(false);
    setNewGroupName('');
    setNewCategoryName('');
    setImages([]);
    setRequiresMinShipping(false);
    setMinShippingQty('0');
    setIsCustomShipping(false);
    setCustomShippingAmount('');
    setImageUrlInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error('Product name is required.');
    if (!costPrice.trim()) return toast.error('Cost price is required.');
    if (!price.trim()) return toast.error('Selling price is required.');
    if (!group) return toast.error('Please select a brand/group.');
    if (!category) return toast.error('Please select a category.');
    if (!size && !isCustomShipping) return toast.error('Please select a product size.');
    if (images.length === 0) return toast.error('Please add at least one image');

    const parsedCost = parseFloat(costPrice.replace(/,/g, '')) || 0;
    const parsedPrice = parseFloat(price.replace(/,/g, '')) || 0;

    if (parsedCost >= parsedPrice) {
      return toast.error('Cost Price cannot be higher or equal to Selling Price.');
    }

    setLoading(true);
    try {
      const uploadedUrls = await Promise.all(images.map(async (img) => {
        if (img.type === 'url') return img.value as string;
        const formData = new FormData();
        formData.append('file', img.value);
        const data = await uploadImageToCloudinary(formData);
        return data.secure_url;
      }));

      const productData: any = {
        name: name.trim(),
        costPrice: parsedCost,
        price: parsedPrice,
        description: description.trim(),
        group: formatStructure(group),
        category: formatStructure(category),
        quantity: Number(quantity),
        size: size || 'medium',
        requiresMinShipping,
        minShippingQty: requiresMinShipping ? Number(minShippingQty) : 0,
        customShippingAmount: isCustomShipping && customShippingAmount ? Number(parsePriceInput(customShippingAmount)) : null,
        images: uploadedUrls,
        updatedAt: new Date().toISOString(),
        vendor: user?.email || '',
      };

      if (editingId) {
        const existingProduct = products.find(p => p.id === editingId);
        const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/TOILET-KITCHEN'));
        if (!hasFullAccess && existingProduct && (existingProduct as any).vendor && (existingProduct as any).vendor !== user?.email) {
          toast.error('You can only edit your own items.');
          setLoading(false);
          return;
        }
        await updateDoc(doc(db, 'toilet_kitchen', editingId), { ...productData, isNewItem: false });
        toast.success('Product updated!');
      } else {
        await addDoc(collection(db, 'toilet_kitchen'), {
          ...productData,
          createdAt: new Date().toISOString()
        });
        toast.success('Product added!');
      }
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast.error('Operation failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: ShopProduct) => {
        const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/TOILET-KITCHEN'));
        if (!hasFullAccess && (product as any).vendor && (product as any).vendor !== user?.email) {
          toast.error('You can only edit your own items.');
          return;
        }
    setEditingId(product.id);
    setName(product.name);
    setCostPrice(formatPriceInput((product.costPrice || 0).toString()));
    setPrice(formatPriceInput((product.price || 0).toString()));
    setDescription(product.description || '');
    setGroup(product.group || '');
    setCategory(product.category || '');
    setQuantity(product.quantity?.toString() || '1');
    setSize(product.size || '');
    setRequiresMinShipping(product.requiresMinShipping || false);
    setMinShippingQty(product.minShippingQty?.toString() || '0');
    setIsCustomShipping(!!(product as any).customShippingAmount);
    setCustomShippingAmount((product as any).customShippingAmount ? formatPriceInput((product as any).customShippingAmount.toString()) : '');
    setImages((product.images || []).map(url => ({ type: 'url', value: url })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
        const existingProduct = products.find(p => p.id === productToDelete);
        const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/TOILET-KITCHEN'));
        if (!hasFullAccess && existingProduct && (existingProduct as any).vendor && (existingProduct as any).vendor !== user?.email) {
          toast.error('You can only delete your own items.');
          setProductToDelete(null);
          return;
        }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'toilet_kitchen', productToDelete));
      toast.success('Product deleted.');
    } catch (error) {
      toast.error('Failed to delete.');
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/TOILET-KITCHEN'));
  const visibleProducts = hasFullAccess ? products : products.filter(p => (p as any).vendor === user?.email);

  const baseFilteredProducts = visibleProducts.filter(p => {
    if (filterGroup === 'Low Stock') return (p.quantity ?? 0) <= 5;
    if (filterGroup === 'All') return true;
    return p.group === filterGroup;
  });

  const filteredProducts = (() => {
    if (!searchQuery.trim()) return baseFilteredProducts;
    const fuse = new Fuse(baseFilteredProducts, {
      keys: ['name', 'group', 'category', 'productCode'],
      threshold: 0.3,
      ignoreLocation: true
    });
    return fuse.search(searchQuery.trim()).map(r => r.item);
  })();

  return (
    <AdminGuard>
      <div className="space-y-8 pb-20 max-w-[1200px] mx-auto ">
        <header className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <FaBoxes className="text-teal-600" /> Toilet & Kitchen Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage WC, sinks, washers, and accessories.</p>
          </div>
          <div className="flex gap-3 items-center w-full md:w-auto">
          </div>
        </header>

        {/* Form Section */}
        <section className="bg-card p-4 md:p-8 rounded-[var(--radius)] border border-border shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-6">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">Product Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} type="text" placeholder="e.g. Stainless Steel Kitchen Sink" className="w-full p-3 rounded-md border border-border bg-background text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-red-700">Cost Price (₦)</label>
                <input required value={costPrice} onChange={e => setCostPrice(formatPriceInput(e.target.value))} type="text" placeholder="e.g. 2,000" className="w-full p-3 rounded-md border border-red-200 bg-background text-sm font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-teal-700 flex justify-between items-center">
                  <span>Selling Price (₦)</span>
                  {costPrice.trim() !== '' && price.trim() !== '' && (parseFloat(costPrice.replace(/,/g, '')) || 0) >= (parseFloat(price.replace(/,/g, '')) || 0) && (
                    <span className="text-[10px] text-red-500 font-bold animate-pulse">⚠️ Cost Price cannot be higher or equal to Sales Price</span>
                  )}
                </label>
                <input required value={price} onChange={e => setPrice(formatPriceInput(e.target.value))} type="text" placeholder="e.g. 3,500" className={`w-full p-3 rounded-md border text-sm font-bold outline-none transition-all ${costPrice.trim() !== '' && price.trim() !== '' && (parseFloat(costPrice.replace(/,/g, '')) || 0) >= (parseFloat(price.replace(/,/g, '')) || 0) ? 'border-red-500 focus:border-red-600 ring-2 ring-red-100' : 'border-teal-200 bg-background'}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Group/Brand */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex justify-between items-center">
                  Brand / Material / Group
                  <button type="button" onClick={() => setIsAddingGroup(!isAddingGroup)} className="text-primary text-[0.7rem] flex items-center gap-1 hover:underline">
                    <FaPlus size={10} /> {isAddingGroup ? 'Cancel' : 'Add New'}
                  </button>
                </label>
                {isAddingGroup ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      placeholder="Type new group..."
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
                          const upperGroup = group.toUpperCase();
                          setCategoriesByGroup({ ...categoriesByGroup, [upperGroup]: [...(categoriesByGroup[upperGroup] || []), formatted] });
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
                    options={group ? (categoriesByGroup[group.toUpperCase()] || []) : []}
                    placeholder={group ? 'Select Category' : 'Choose Group First'}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">Description (Optional)</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Product details, dimensions, materials..." className="w-full p-3 rounded-md border border-border bg-background text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Product Size</label>
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
                  <option value="custom" className="text-teal-700 font-bold">Customise Shipping Amount</option>
                </select>
                {isCustomShipping && (
                   <div className="mt-2 animate-[slideIn_0.2s_ease]">
                      <label className="text-[0.65rem] font-bold text-teal-700 mb-1 block uppercase">Custom Shipping Amount (₦)</label>
                      <input
                        type="text"
                        required={isCustomShipping}
                        value={customShippingAmount}
                        onChange={(e) => setCustomShippingAmount(formatPriceInput(e.target.value))}
                        placeholder="e.g. 5,000"
                        className="w-full p-2 rounded-md border border-teal-500/50 bg-background text-sm focus:border-teal-600 outline-none transition-all font-bold"
                      />
                   </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold">Product Images (Max 3)</label>
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
                <label className="flex items-center justify-center gap-2 p-3 rounded-md border border-dashed border-primary bg-primary/5 text-primary font-bold cursor-pointer hover:bg-primary/10 text-sm">
                  <FaImage /> Upload Files
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              <div className="flex flex-wrap gap-4 mt-4">
                {images.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-md overflow-hidden border border-border bg-muted">
                    <img
                      src={img.type === 'url' ? (img.value as string) : URL.createObjectURL(img.value as File)}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full z-10"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-4">
              <div className="max-w-[200px] space-y-2">
                <label className="text-xs md:text-sm font-bold text-teal-700">Quantity In Stock</label>
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

            {/* MIN SHIPPING QTY */}
            <div className="pt-4 border-t border-border mt-4">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-sm mb-3">
                <input type="checkbox" checked={requiresMinShipping} onChange={e => setRequiresMinShipping(e.target.checked)} className="size-4 accent-teal-600" />
                Require Minimum Quantity for Standalone Shipping?
              </label>
              {requiresMinShipping && (
                <div className="max-w-[200px] space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-xs md:text-sm font-bold text-teal-700">Minimum Quantity Required</label>
                  <input
                    required={requiresMinShipping}
                    value={minShippingQty}
                    onChange={e => setMinShippingQty(e.target.value)}
                    type="number"
                    min="1"
                    className="w-full p-2 rounded-md border border-border bg-background text-sm font-bold focus:border-teal-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-border mt-4">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 bg-teal-600 text-white py-4 rounded-md font-bold flex items-center justify-center gap-2 text-sm transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-teal-700'}`}
              >
                {loading ? 'Processing...' : (editingId ? 'Update Product' : 'Add Product')}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="bg-muted px-8 py-4 rounded-md font-bold border border-border text-sm">Cancel</button>
              )}
            </div>
          </form>
        </section>

        {/* List Section */}
        <section className="bg-card p-4 md:p-8 rounded-[var(--radius)] border border-border shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <h2 className="text-xl md:text-2xl font-bold">Inventory ({filteredProducts.length})</h2>
              <VendorSalesHistory userEmail={user?.email || null} isCEO={isCEO} inventoryCollection="toilet_kitchen" allowAll />
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
                <option value="Low Stock">Low Stock (≤ 5)</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {filteredProducts.map(product => (
              <div key={product.id} className="relative group bg-card rounded-[var(--radius)] h-full flex flex-col">
                <div className="relative flex-1 flex flex-col">
                  <ShopCard
                    food={product}
                    isAdmin={true}
                    isFood={false}
                    themeColor="teal"
                    onEdit={handleEdit}
                    onDelete={() => setProductToDelete(product.id)}
                  />
                </div>
              </div>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              No products found. Add some above!
            </div>
          )}
        </section>

        {/* Delete Confirmation Modal */}
        {productToDelete && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 px-4">
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="text-red-500 mb-4 flex justify-center"><FaTrash size={40} /></div>
              <h3 className="font-bold text-xl mb-2">Delete Product?</h3>
              <p className="text-sm text-muted-foreground mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setProductToDelete(null)} className="flex-1 py-3 rounded-md border border-border font-bold hover:bg-muted">Cancel</button>
                <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-3 rounded-md bg-red-600 text-white font-bold hover:bg-red-700">
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
