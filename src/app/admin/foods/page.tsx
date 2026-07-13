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
import { FaPlus, FaTrash, FaEdit, FaImage, FaTimes, FaSearch, FaUtensils } from 'react-icons/fa';
import AdminGuard from '@/components/AdminGuard';
import { uploadImageToCloudinary } from '@/actions/upload';
import ShopCard, { ShopProduct } from '@/components/ShopCard';
import SearchableSelect from '@/components/SearchableSelect';

const formatPriceInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat().format(parseInt(digits));
};

const parsePriceInput = (value: string) => {
  return value.replace(/\D/g, "");
};

export default function AdminFoods() {
  const [foods, setFoods] = useState<ShopProduct[]>([]);
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
  const [requiresMinShipping, setRequiresMinShipping] = useState(false);
  const [minShippingQty, setMinShippingQty] = useState('0');

  // Measurements State
  const [includeMeasurements, setIncludeMeasurements] = useState(false);
  const [selectedMeasurements, setSelectedMeasurements] = useState<Record<string, boolean>>({});

  const grainMeasurements = ['1 cup', '1 congo', '1 mudu', '1 paint rubber', '1/4 bag (quarter bag)', '1/2 bag (half bag)', '1 bag', '2 bags'];
  const weightMeasurements = ['1 kg', '2 kg', '5 kg', '10 kg', '25 kg', '50 kg'];

  const toggleMeasurement = (m: string) => {
    setSelectedMeasurements(prev => {
      const copy = { ...prev };
      if (copy[m]) {
        delete copy[m];
      } else {
        copy[m] = true;
      }
      return copy;
    });
  };

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
  const [foodToDelete, setFoodToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Fetch one distribution area to show size prices as reference
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
    const q = query(collection(db, 'foods'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShopProduct[];
      
      const sortedProds = [...prods].sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setFoods(sortedProds);

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
      console.warn("Foods listener error:", error);
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
      toast.error('Maximum 3 images allowed for foods');
      return;
    }
    setImages([...images, { type: 'url', value: imageUrlInput }]);
    setImageUrlInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (images.length + files.length > 3) {
      toast.error('Maximum 3 images allowed for foods');
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
    setRequiresMinShipping(false);
    setMinShippingQty('0');
    setIncludeMeasurements(false);
    setSelectedMeasurements({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error('Food name is required.');
    if (!costPrice.trim()) return toast.error('Cost price is required.');
    if (!price.trim()) return toast.error('Selling price is required.');
    if (!group) return toast.error('Please select a group.');
    if (!category) return toast.error('Please select a category.');
    if (!size) return toast.error('Please select a product size.');
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

      const foodData: any = {
        name: name.trim(),
        costPrice: parsedCost,
        price: parsedPrice,
        description: description.trim(),
        group: formatStructure(group),
        category: formatStructure(category),
        quantity: Number(quantity),
        size: size || 'medium',
        measurements: includeMeasurements ? Object.keys(selectedMeasurements).join(', ') : '',
        requiresMinShipping,
        minShippingQty: requiresMinShipping ? Number(minShippingQty) : 0,
        images: uploadedUrls,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'foods', editingId), foodData);
        toast.success('Food item updated!');
      } else {
        await addDoc(collection(db, 'foods'), {
          ...foodData,
          createdAt: new Date().toISOString()
        });
        toast.success('Food item added!');
      }
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast.error('Operation failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (food: ShopProduct) => {
    setEditingId(food.id);
    setName(food.name);
    setCostPrice(formatPriceInput((food.costPrice || 0).toString()));
    setPrice(formatPriceInput((food.price || 0).toString()));
    setDescription(food.description || '');
    setGroup(food.group || '');
    setCategory(food.category || '');
    setQuantity(food.quantity?.toString() || '1');
    setSize(food.size || '');
    setRequiresMinShipping(food.requiresMinShipping || false);
    setMinShippingQty(food.minShippingQty?.toString() || '0');
    
    // Load measurements if they exist
    const foodMeasurements = (food as any).measurements;
    if (foodMeasurements) {
      setIncludeMeasurements(true);
      const mObj: Record<string, boolean> = {};
      foodMeasurements.split(', ').forEach((m: string) => {
        if (m) mObj[m] = true;
      });
      setSelectedMeasurements(mObj);
    } else {
      setIncludeMeasurements(false);
      setSelectedMeasurements({});
    }

    setImages((food.images || []).map(url => ({ type: 'url', value: url })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!foodToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'foods', foodToDelete));
      toast.success('Food deleted.');
    } catch (error) {
      toast.error('Failed to delete.');
    } finally {
      setIsDeleting(false);
      setFoodToDelete(null);
    }
  };

  const filteredFoods = foods.filter(f => {
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) {
      return filterGroup === 'All' || f.group === filterGroup;
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
        checkField(f.name) ||
        checkField(f.group || '') ||
        checkField(f.category || '')
      );
    });

    const matchesGroup = filterGroup === 'All' || f.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <AdminGuard>
      <div className="space-y-8 pb-20 max-w-[1200px] mx-auto ">
        <header className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <FaUtensils className="text-green-600" /> Food Market Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage food items in your market.</p>
          </div>
        </header>

        {/* Form Section */}
        <section className="bg-card p-4 md:p-8 rounded-[var(--radius)] border border-border shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-6">{editingId ? 'Edit Food' : 'Add New Food'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">Food Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} type="text" placeholder="e.g. 50kg Bag of Rice, Yam Tubers, Milo" className="w-full p-3 rounded-md border border-border bg-background text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-red-700">Cost Price (₦)</label>
                <input required value={costPrice} onChange={e => setCostPrice(formatPriceInput(e.target.value))} type="text" placeholder="e.g. 2,000" className="w-full p-3 rounded-md border border-red-200 bg-background text-sm font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-green-700 flex justify-between items-center">
                  <span>Selling Price (₦)</span>
                  {costPrice.trim() !== '' && price.trim() !== '' && (parseFloat(costPrice.replace(/,/g, '')) || 0) >= (parseFloat(price.replace(/,/g, '')) || 0) && (
                    <span className="text-[10px] text-red-500 font-bold animate-pulse">⚠️ Cost Price cannot be higher or equal to Sales Price</span>
                  )}
                </label>
                <input required value={price} onChange={e => setPrice(formatPriceInput(e.target.value))} type="text" placeholder="e.g. 3,500" className={`w-full p-3 rounded-md border text-sm font-bold outline-none transition-all ${costPrice.trim() !== '' && price.trim() !== '' && (parseFloat(costPrice.replace(/,/g, '')) || 0) >= (parseFloat(price.replace(/,/g, '')) || 0) ? 'border-red-500 focus:border-red-600 ring-2 ring-red-100' : 'border-green-200 bg-background'}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="High quality and well preserved..." className="w-full p-3 rounded-md border border-border bg-background text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Product Size (Shipping)</label>
                <select required value={size} onChange={e => setSize(e.target.value)} className="w-full p-3 rounded-md border border-border bg-background text-[11px] md:text-sm">
                  <option value="">Select Size</option>
                  <option value="extra-large">Extra Large {sizePrices['extra-large'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['extra-large']}` : ''}</option>
                  <option value="large">Large {sizePrices['large'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['large']}` : ''}</option>
                  <option value="medium">Medium {sizePrices['medium'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['medium']}` : ''}</option>
                  <option value="small">Small {sizePrices['small'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['small']}` : ''}</option>
                  <option value="extra-small">Extra Small {sizePrices['extra-small'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['extra-small']}` : ''}</option>
                  <option value="extra-extra-small">Extra Extra Small {sizePrices['extra-extra-small'] ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${sizePrices['extra-extra-small']}` : ''}</option>
                </select>
              </div>
            </div>

            {/* Measurements Section */}
            <div className="space-y-2 mb-6">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                <input 
                  type="checkbox" 
                  checked={includeMeasurements} 
                  onChange={(e) => setIncludeMeasurements(e.target.checked)} 
                  className="size-4 accent-green-600"
                />
                Add Market Measurements (Grains, Kilos, etc.)
              </label>
              
              {includeMeasurements && (
                <div className="space-y-4 py-4 px-2 border border-green-200 rounded-lg bg-green-50/50 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-bold block">Available Measurements (tick to add)</label>
                  
                  {/* Grain Measurements */}
                  <div>
                    <p className="text-xs font-black text-green-800 mb-1.5">Grains & General Measurements</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {grainMeasurements.map(m => (
                        <div key={`gm-${m}`} className={`flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-pointer transition-colors ${selectedMeasurements[m] ? 'border-green-500 bg-green-100' : 'border-border bg-background hover:bg-muted'}`} onClick={() => toggleMeasurement(m)}>
                          <input type="checkbox" checked={!!selectedMeasurements[m]} readOnly className="accent-green-600 pointer-events-none" />
                          <span className="font-bold">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weight Measurements */}
                  <div>
                    <p className="text-xs font-black text-green-800 mb-1.5">Weight (Chicken, Fish, etc.)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {weightMeasurements.map(m => (
                        <div key={`wm-${m}`} className={`flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-pointer transition-colors ${selectedMeasurements[m] ? 'border-green-500 bg-green-100' : 'border-border bg-background hover:bg-muted'}`} onClick={() => toggleMeasurement(m)}>
                          <input type="checkbox" checked={!!selectedMeasurements[m]} readOnly className="accent-green-600 pointer-events-none" />
                          <span className="font-bold">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {Object.keys(selectedMeasurements).length > 0 && (
                    <div className="text-xs font-bold text-green-700 pt-2 border-t border-green-200">
                      Selected: {Object.keys(selectedMeasurements).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold">Food Images (Max 3)</label>
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

            {/* QUANTITY MOVED HERE */}
            <div className="pt-4 border-t border-border mt-4">
              <div className="max-w-[200px] space-y-2">
                <label className="text-xs md:text-sm font-bold text-green-700">Quantity In Stock</label>
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
                <input type="checkbox" checked={requiresMinShipping} onChange={e => setRequiresMinShipping(e.target.checked)} className="size-4 accent-green-600" />
                Require Minimum Quantity for Standalone Shipping?
              </label>
              {requiresMinShipping && (
                <div className="max-w-[200px] space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-xs md:text-sm font-bold text-green-700">Minimum Quantity Required</label>
                  <input
                    required={requiresMinShipping}
                    value={minShippingQty}
                    onChange={e => setMinShippingQty(e.target.value)}
                    type="number"
                    min="1"
                    className="w-full p-2 rounded-md border border-border bg-background text-sm font-bold focus:border-green-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-border mt-4">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 bg-green-600 text-white py-4 rounded-md font-bold flex items-center justify-center gap-2 text-sm transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'}`}
              >
                {loading ? 'Processing...' : (editingId ? 'Update Food' : 'Add Food')}
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
            <h2 className="text-xl md:text-2xl font-bold">Food Inventory ({filteredFoods.length})</h2>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search foods..."
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
            {filteredFoods.map(food => (
              <div key={food.id} className="relative group bg-card rounded-[var(--radius)] h-full flex flex-col">
                <div className="relative flex-1 flex flex-col">
                  <ShopCard
                    food={food}
                    isAdmin={true}
                    onEdit={handleEdit}
                    onDelete={() => setFoodToDelete(food.id)}
                  />
                </div>
              </div>
            ))}
          </div>
          {filteredFoods.length === 0 && (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              No foods found. Add some above!
            </div>
          )}
        </section>

        {/* Delete Confirmation Modal */}
        {foodToDelete && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 px-4">
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="text-red-500 mb-4 flex justify-center"><FaTrash size={40} /></div>
              <h3 className="font-bold text-xl mb-2">Delete Food?</h3>
              <p className="text-sm text-muted-foreground mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setFoodToDelete(null)} className="flex-1 py-3 rounded-md border border-border font-bold hover:bg-muted">Cancel</button>
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
