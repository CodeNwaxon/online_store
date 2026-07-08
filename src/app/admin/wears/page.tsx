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
import { FaPlus, FaTrash, FaEdit, FaImage, FaTimes, FaSearch, FaUserTie, FaBoxes } from 'react-icons/fa';
import AdminGuard from '@/components/AdminGuard';
import { uploadImageToCloudinary } from '@/actions/upload';
import ShopCard, { ShopProduct } from '@/components/ShopCard';

import { useAdmin } from '@/hooks/useAdmin';

const formatPriceInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat().format(parseInt(digits));
};

const parsePriceInput = (value: string) => {
  return value.replace(/\D/g, "");
};

export default function AdminWears() {
  const { user, isCEO } = useAdmin();
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
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});
  const [color, setColor] = useState('');

  // Size definitions
  const menShoeSizes = ['45', '44', '43', '42', '41', '40', '39', '38', '36', '32', '30'];
  const womenShoeSizes = ['42', '41', '40', '39', '38', '37', '36', '35', '34', '33'];
  const childrenShoeSizes = ['34', '33', '32', '31', '30', '29', '28', '27', '26', '25', '24', '23', '22'];
  const clothLetterSizes = ['XXL', 'XL', 'L', 'M', 'S', 'XS', 'XXS'];
  const clothWaistSizes = ['44', '42', '40', '38', '36', '34', '32', '30', '28', '26'];

  const isShoeGroup = group?.toLowerCase() === 'shoes' || group?.toLowerCase() === 'shoe';
  const isClothGroup = group?.toLowerCase() === 'cloth' || group?.toLowerCase() === 'cloths' || group?.toLowerCase() === 'clothes';

  const toggleSize = (sz: string) => {
    setSizeQuantities(prev => {
      const copy = { ...prev };
      if (copy[sz] !== undefined) {
        delete copy[sz];
      } else {
        copy[sz] = 1;
      }
      return copy;
    });
  };

  const updateSizeQty = (sz: string, qty: number) => {
    setSizeQuantities(prev => ({ ...prev, [sz]: Math.max(0, qty) }));
  };

  // Auto-compute total quantity from sizeQuantities when wears group
  useEffect(() => {
    if (isShoeGroup || isClothGroup) {
      const total = Object.values(sizeQuantities).reduce((a, b) => a + b, 0);
      if (total > 0) {
        setQuantity(total.toString());
      }
    }
  }, [sizeQuantities, isShoeGroup, isClothGroup]);
  const [requiresMinShipping, setRequiresMinShipping] = useState(false);
  const [minShippingQty, setMinShippingQty] = useState('0');
  const [includeColor, setIncludeColor] = useState(false);

  // Dynamic Groups & Categories State
  const [groups, setGroups] = useState<string[]>([]);
  const [categoriesByGroup, setCategoriesByGroup] = useState<Record<string, string[]>>({});
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const formatStructure = (str: string) => {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
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
    const q = query(collection(db, 'wears'), orderBy('updatedAt', 'desc'));
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

      setGroups(Array.from(new Set([...groups, ...uniqueGroups.map((g: any) => formatStructure(g))])));
      setCategoriesByGroup(newMap);

    }, (error) => {
      console.warn("Wears listener error:", error);
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
    setSizeQuantities({});
    setColor('');
    setIsAddingGroup(false);
    setIsAddingCategory(false);
    setNewGroupName('');
    setNewCategoryName('');
    setImages([]);
    setRequiresMinShipping(false);
    setMinShippingQty('0');
    setIncludeColor(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error('Product name is required.');
    if (!costPrice.trim()) return toast.error('Cost price is required.');
    if (!price.trim()) return toast.error('Selling price is required.');
    if (!group) return toast.error('Please select a brand/group.');
    if (!category) return toast.error('Please select a category.');
    if (!size) return toast.error('Please select a shipping size.');
    if ((isShoeGroup || isClothGroup) && Object.keys(sizeQuantities).length === 0) return toast.error('Please select at least one product size.');
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
        sizeQuantities: (isShoeGroup || isClothGroup) ? sizeQuantities : {},
        itemSize: Object.keys(sizeQuantities).join(', '),
        color: (includeColor || isShoeGroup || isClothGroup) ? color.trim() : '',
        requiresMinShipping,
        minShippingQty: requiresMinShipping ? Number(minShippingQty) : 0,
        images: uploadedUrls,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        // Verify ownership before updating (CEO can edit any)
        const existingProduct = products.find(p => p.id === editingId);
        if (!isCEO && existingProduct && (existingProduct as any).vendor !== user?.email) {
          toast.error('You can only edit your own products.');
          setLoading(false);
          return;
        }
        await updateDoc(doc(db, 'wears', editingId), productData);
        toast.success('Product updated!');
      } else {
        await addDoc(collection(db, 'wears'), {
          ...productData,
          vendor: user?.email || '',
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
    // Block editing another admin's products (CEO can edit any)
    if (!isCEO && (product as any).vendor && (product as any).vendor !== user?.email) {
      toast.error('You can only edit your own products.');
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
    setSizeQuantities((product as any).sizeQuantities || {});
    setColor(product.color || '');
    setIncludeColor(!!product.color);
    setRequiresMinShipping(product.requiresMinShipping || false);
    setMinShippingQty(product.minShippingQty?.toString() || '0');
    setImages((product.images || []).map(url => ({ type: 'url', value: url })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    // Block deleting another admin's products (CEO can delete any)
    const existingProduct = products.find(p => p.id === productToDelete);
    if (!isCEO && existingProduct && (existingProduct as any).vendor && (existingProduct as any).vendor !== user?.email) {
      toast.error('You can only delete your own products.');
      setProductToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'wears', productToDelete));
      toast.success('Product deleted.');
    } catch (error) {
      toast.error('Failed to delete.');
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  // Filter products: admins only see their own, CEO sees all
  const visibleProducts = isCEO ? products : products.filter(p => (p as any).vendor === user?.email);

  const filteredProducts = visibleProducts.filter(p => {
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) {
      return filterGroup === 'All' || p.group === filterGroup;
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
        checkField(p.group || '') ||
        checkField(p.category || '')
      );
    });

    const matchesGroup = filterGroup === 'All' || p.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <AdminGuard>
      <div className="space-y-8 pb-20 max-w-[1200px] mx-auto ">
        <header className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <FaBoxes className="text-purple-600" /> Wears Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage clothing, shoes, and accessories.</p>
          </div>
        </header>

        {/* Form Section */}
        <section className="bg-card py-4 px-2 md:p-8 rounded-[var(--radius)] border border-border shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-6">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vendor (auto-filled, read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-purple-700">Vendor</label>
              <input
                readOnly
                value={user?.email || ''}
                type="text"
                className="w-full p-3 rounded-md border border-purple-200 bg-muted text-sm font-semibold text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">Product Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} type="text" placeholder="e.g. Men's Cotton T-Shirt" className="w-full p-3 rounded-md border border-border bg-background text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-red-700">Cost Price (₦)</label>
                <input required value={costPrice} onChange={e => setCostPrice(formatPriceInput(e.target.value))} type="text" placeholder="e.g. 2,000" className="w-full p-3 rounded-md border border-red-200 bg-background text-sm font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-purple-700 flex justify-between items-center">
                  <span>Selling Price (₦)</span>
                  {costPrice.trim() !== '' && price.trim() !== '' && (parseFloat(costPrice.replace(/,/g, '')) || 0) >= (parseFloat(price.replace(/,/g, '')) || 0) && (
                    <span className="text-[10px] text-red-500 font-bold animate-pulse">⚠️ Cost Price cannot be higher or equal to Sales Price</span>
                  )}
                </label>
                <input required value={price} onChange={e => setPrice(formatPriceInput(e.target.value))} type="text" placeholder="e.g. 3,500" className={`w-full p-3 rounded-md border text-sm font-bold outline-none transition-all ${costPrice.trim() !== '' && price.trim() !== '' && (parseFloat(costPrice.replace(/,/g, '')) || 0) >= (parseFloat(price.replace(/,/g, '')) || 0) ? 'border-red-500 focus:border-red-600 ring-2 ring-red-100' : 'border-purple-200 bg-background'}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Group/Brand */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex justify-between items-center">
                  Gender / Group
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
                      onClick={() => { if (newGroupName) { const formatted = formatStructure(newGroupName); setGroup(formatted); setGroups([...groups, formatted]); setIsAddingGroup(false); } }}
                      className="bg-primary text-white px-4 rounded-md text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select required value={group} onChange={e => { setGroup(e.target.value); setCategory(''); }} className="w-full p-3 rounded-md border border-border bg-background text-sm">
                    <option value="">Select Group</option>
                    {groups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
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
                  <select
                    required
                    disabled={!group}
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-3 rounded-md border border-border bg-background text-sm disabled:bg-muted"
                  >
                    <option value="">{group ? 'Select Category' : 'Choose Group First'}</option>
                    {group && categoriesByGroup[group.toUpperCase()]?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                <input 
                  type="checkbox" 
                  checked={includeColor || isShoeGroup || isClothGroup} 
                  onChange={(e) => setIncludeColor(e.target.checked)} 
                  className="size-4 accent-purple-600"
                  disabled={isShoeGroup || isClothGroup} // always true for these
                />
                Include Color Input
              </label>
              {(includeColor || isShoeGroup || isClothGroup) && (
                <div className="py-4 px-2 border border-purple-200 rounded-lg bg-purple-50/50 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-bold">Colors (comma separated)</label>
                  <input value={color} onChange={e => setColor(e.target.value)} type="text" placeholder="e.g. Red, Blue, Black, White" className="w-full p-3 rounded-md border border-border bg-background text-sm" />
                  {color && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {color.split(',').map((c, i) => c.trim() && (
                        <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 bg-white capitalize" style={{ color: c.trim().toLowerCase().replace(/\s/g, '') }}>{c.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {(isShoeGroup || isClothGroup) && (
              <div className="space-y-4 mb-6 py-4 px-2 border border-purple-200 rounded-lg bg-purple-50/50">
                <label className="text-sm font-bold block">Available Sizes (tick to add, enter qty)</label>

                {isShoeGroup && (
                  <>
                    {/* Men's Shoe Sizes */}
                    <div>
                      <p className="text-xs font-black text-purple-800 mb-1.5">Men&apos;s Sizes</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {menShoeSizes.map(sz => (
                          <div key={`m-${sz}`} className={`flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-pointer transition-colors ${sizeQuantities[sz] !== undefined ? 'border-purple-500 bg-purple-100' : 'border-border bg-background hover:bg-muted'}`} onClick={() => toggleSize(sz)}>
                            <input type="checkbox" checked={sizeQuantities[sz] !== undefined} readOnly className="accent-purple-600 pointer-events-none" />
                            <span className="font-bold">{sz}</span>
                            {sizeQuantities[sz] !== undefined && (
                              <input type="number" min="0" value={sizeQuantities[sz]} onClick={e => e.stopPropagation()} onChange={e => updateSizeQty(sz, parseInt(e.target.value) || 0)} className="w-12 ml-auto text-center p-0.5 rounded border border-purple-300 text-xs font-bold bg-white" placeholder="Qty" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Women's Shoe Sizes */}
                    <div>
                      <p className="text-xs font-black text-purple-800 mb-1.5">Women&apos;s Sizes</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {womenShoeSizes.map(sz => (
                          <div key={`w-${sz}`} className={`flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-pointer transition-colors ${sizeQuantities[`W${sz}`] !== undefined ? 'border-purple-500 bg-purple-100' : 'border-border bg-background hover:bg-muted'}`} onClick={() => toggleSize(`W${sz}`)}>
                            <input type="checkbox" checked={sizeQuantities[`W${sz}`] !== undefined} readOnly className="accent-purple-600 pointer-events-none" />
                            <span className="font-bold">{sz}</span>
                            {sizeQuantities[`W${sz}`] !== undefined && (
                              <input type="number" min="0" value={sizeQuantities[`W${sz}`]} onClick={e => e.stopPropagation()} onChange={e => updateSizeQty(`W${sz}`, parseInt(e.target.value) || 0)} className="w-12 ml-auto text-center p-0.5 rounded border border-purple-300 text-xs font-bold bg-white" placeholder="Qty" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Children's Shoe Sizes */}
                    <div>
                      <p className="text-xs font-black text-purple-800 mb-1.5">Children&apos;s Sizes</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {childrenShoeSizes.map(sz => (
                          <div key={`c-${sz}`} className={`flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-pointer transition-colors ${sizeQuantities[`C${sz}`] !== undefined ? 'border-purple-500 bg-purple-100' : 'border-border bg-background hover:bg-muted'}`} onClick={() => toggleSize(`C${sz}`)}>
                            <input type="checkbox" checked={sizeQuantities[`C${sz}`] !== undefined} readOnly className="accent-purple-600 pointer-events-none" />
                            <span className="font-bold">{sz}</span>
                            {sizeQuantities[`C${sz}`] !== undefined && (
                              <input type="number" min="0" value={sizeQuantities[`C${sz}`]} onClick={e => e.stopPropagation()} onChange={e => updateSizeQty(`C${sz}`, parseInt(e.target.value) || 0)} className="w-12 ml-auto text-center p-0.5 rounded border border-purple-300 text-xs font-bold bg-white" placeholder="Qty" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {isClothGroup && (
                  <>
                    {/* Letter Sizes */}
                    <div>
                      <p className="text-xs font-black text-purple-800 mb-1.5">Letter Sizes</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {clothLetterSizes.map(sz => (
                          <div key={`l-${sz}`} className={`flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-pointer transition-colors ${sizeQuantities[sz] !== undefined ? 'border-purple-500 bg-purple-100' : 'border-border bg-background hover:bg-muted'}`} onClick={() => toggleSize(sz)}>
                            <input type="checkbox" checked={sizeQuantities[sz] !== undefined} readOnly className="accent-purple-600 pointer-events-none" />
                            <span className="font-bold">{sz}</span>
                            {sizeQuantities[sz] !== undefined && (
                              <input type="number" min="0" value={sizeQuantities[sz]} onClick={e => e.stopPropagation()} onChange={e => updateSizeQty(sz, parseInt(e.target.value) || 0)} className="w-12 ml-auto text-center p-0.5 rounded border border-purple-300 text-xs font-bold bg-white" placeholder="Qty" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Waist Sizes */}
                    <div>
                      <p className="text-xs font-black text-purple-800 mb-1.5">Waist Sizes</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {clothWaistSizes.map(sz => (
                          <div key={`ws-${sz}`} className={`flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-pointer transition-colors ${sizeQuantities[sz] !== undefined ? 'border-purple-500 bg-purple-100' : 'border-border bg-background hover:bg-muted'}`} onClick={() => toggleSize(sz)}>
                            <input type="checkbox" checked={sizeQuantities[sz] !== undefined} readOnly className="accent-purple-600 pointer-events-none" />
                            <span className="font-bold">{sz}</span>
                            {sizeQuantities[sz] !== undefined && (
                              <input type="number" min="0" value={sizeQuantities[sz]} onClick={e => e.stopPropagation()} onChange={e => updateSizeQty(sz, parseInt(e.target.value) || 0)} className="w-12 ml-auto text-center p-0.5 rounded border border-purple-300 text-xs font-bold bg-white" placeholder="Qty" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {Object.keys(sizeQuantities).length > 0 && (
                  <div className="text-xs font-bold text-purple-700 pt-2 border-t border-purple-200">
                    Total Stock: {Object.values(sizeQuantities).reduce((a, b) => a + b, 0)} | Selected: {Object.keys(sizeQuantities).join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">Description (Optional)</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Product details, sizes, colors..." className="w-full p-3 rounded-md border border-border bg-background text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Shipping Size (Required)</label>
                <select required value={size} onChange={e => setSize(e.target.value)} className="w-full p-3 rounded-md border border-border bg-background text-[11px] md:text-sm">
                  <option value="">Select Shipping Size</option>
                  <option value="extra-large">Extra Large {sizePrices['extra-large'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['extra-large']}` : ''}</option>
                  <option value="large">Large {sizePrices['large'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['large']}` : ''}</option>
                  <option value="medium">Medium {sizePrices['medium'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['medium']}` : ''}</option>
                  <option value="small">Small {sizePrices['small'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['small']}` : ''}</option>
                  <option value="extra-small">Extra Small {sizePrices['extra-small'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['extra-small']}` : ''}</option>
                  <option value="extra-extra-small">Extra Extra Small {sizePrices['extra-extra-small'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['extra-extra-small']}` : ''}</option>
                </select>
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
                <label className="text-xs md:text-sm font-bold text-purple-700">Quantity In Stock</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(0, Number(quantity) - 1).toString())}
                    className="size-10 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors font-bold"
                  >
                    -
                  </button>
                  <input
                    required
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    type="number"
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
                <input type="checkbox" checked={requiresMinShipping} onChange={e => setRequiresMinShipping(e.target.checked)} className="size-4 accent-purple-600" />
                Require Minimum Quantity for Standalone Shipping?
              </label>
              {requiresMinShipping && (
                <div className="max-w-[200px] space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-xs md:text-sm font-bold text-purple-700">Minimum Quantity Required</label>
                  <input
                    required={requiresMinShipping}
                    value={minShippingQty}
                    onChange={e => setMinShippingQty(e.target.value)}
                    type="number"
                    min="1"
                    className="w-full p-2 rounded-md border border-border bg-background text-sm font-bold focus:border-purple-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-border mt-4">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 bg-purple-600 text-white py-4 rounded-md font-bold flex items-center justify-center gap-2 text-sm transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-purple-700'}`}
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
        <section className="bg-card py-4 px-1.5 md:p-8 rounded-[var(--radius)] border border-border shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
            <h2 className="ml-2 text-xl md:text-2xl font-bold">Inventory ({filteredProducts.length})</h2>
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

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1 md:gap-6 items-stretch">
            {filteredProducts.map(product => (
              <div key={product.id} className="relative group bg-card rounded-[var(--radius)] h-full flex flex-col">
                <div className="relative flex-1 flex flex-col mb-2">
                  <ShopCard
                    food={product}
                    isAdmin={true}
                    isFood={false}
                    themeColor="purple"
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
