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
import { FaPlus, FaTrash, FaEdit, FaImage, FaTimes, FaSearch, FaUtensils, FaChevronDown, FaEgg, FaBox, FaBoxes, FaWeightHanging } from 'react-icons/fa';
import AdminGuard from '@/components/AdminGuard';
import { uploadImageToCloudinary, deleteImagesFromCloudinary } from '@/actions/upload';
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

export default function AdminFoods() {
  const { user, isCEO, adminData } = useAdmin();
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
  const [isCustomShipping, setIsCustomShipping] = useState(false);
  const [customShippingAmount, setCustomShippingAmount] = useState('');
  const [requiresMinShipping, setRequiresMinShipping] = useState(false);
  const [minShippingQty, setMinShippingQty] = useState('0');

  // Dynamic Packaging & Pricing Type State
  type FoodPricingType = 'standard' | 'bags' | 'crates' | 'tins' | 'cartons' | 'weight' | 'tubers' | 'custom';
  const [pricingType, setPricingType] = useState<FoodPricingType>('standard');

  // Measurements State
  const [selectedMeasurements, setSelectedMeasurements] = useState<Record<string, string>>({});
  const [selectedMeasurementCosts, setSelectedMeasurementCosts] = useState<Record<string, string>>({});
  const [selectedMeasurementQuantities, setSelectedMeasurementQuantities] = useState<Record<string, string>>({});

  // Custom portion/measurement inputs
  const [customPortions, setCustomPortions] = useState<string[]>([]);
  const [newCustomPortionInput, setNewCustomPortionInput] = useState('');
  const [isAddingCustomPortion, setIsAddingCustomPortion] = useState(false);

  // Preset Lists for Nigerian Market Items
  const bagPortionPresets = ['2 bags', '1/2 bag (half bag)', '1/4 bag (quarter bag)', '1 paint rubber', '1 congo', '1 mudu', '1 cup'];
  const weightPresets = ['1 kg', '2 kg', '5 kg', '10 kg', '25 kg', 'Carton'];
  const tinPresets = [
    'Big Tin (800g - 900g)',
    'Medium Tin (400g)',
    'Small Tin (160g - 170g)',
    'Carton of Tins',
    'Roll / Sachet Strip',
    'Single Sachet'
  ];
  const cartonPresets = ['Full Carton', 'Half Carton', 'Single Pack / Bottle'];
  const tuberPresets = ['1 Tuber', 'Heap of 3', 'Heap of 5', 'Heap of 10', 'Bunch (Plantain)'];
  const eggSizes = [
    { label: 'Big / Jumbo Size Eggs', prefix: 'Big' },
    { label: 'Medium Size Eggs', prefix: 'Medium' },
    { label: 'Small Size Eggs', prefix: 'Small' }
  ];

  const toggleMeasurement = (m: string) => {
    setSelectedMeasurements(prev => {
      const copy = { ...prev };
      if (m in copy) {
        delete copy[m];
      } else {
        copy[m] = '';
      }
      return copy;
    });
    setSelectedMeasurementCosts(prev => {
      const copy = { ...prev };
      if (m in copy) {
        delete copy[m];
      } else {
        copy[m] = '';
      }
      return copy;
    });
    setSelectedMeasurementQuantities(prev => {
      const copy = { ...prev };
      if (m in copy) {
        delete copy[m];
      } else {
        copy[m] = '';
      }
      return copy;
    });
  };

  const setMeasurementPrice = (m: string, value: string) => {
    setSelectedMeasurements(prev => ({ ...prev, [m]: value }));
  };

  const setMeasurementCost = (m: string, value: string) => {
    setSelectedMeasurementCosts(prev => ({ ...prev, [m]: value }));
  };

  const setMeasurementQuantity = (m: string, value: string) => {
    setSelectedMeasurementQuantities(prev => ({ ...prev, [m]: value }));
  };

  // Auto-calculate total quantity from active measurements when multi-tier pricing is used
  useEffect(() => {
    if (pricingType === 'crates') {
      const eggCrateKeys = [
        'Big - Full Crate (30 Eggs)', 'Big - Half Crate (15 Eggs)',
        'Medium - Full Crate (30 Eggs)', 'Medium - Half Crate (15 Eggs)',
        'Small - Full Crate (30 Eggs)', 'Small - Half Crate (15 Eggs)'
      ];
      const activeCrateKeys = eggCrateKeys.filter(k => k in selectedMeasurements);
      if (activeCrateKeys.length > 0) {
        const total = activeCrateKeys.reduce((sum, k) => {
          const val = parseInt(selectedMeasurementQuantities[k] || '0', 10);
          return sum + (isNaN(val) || val < 0 ? 0 : val);
        }, 0);
        setQuantity(total.toString());
      }
    } else if (pricingType === 'tins' || pricingType === 'cartons' || pricingType === 'weight' || pricingType === 'tubers' || pricingType === 'custom') {
      const activeKeys = Object.keys(selectedMeasurements);
      if (activeKeys.length > 0) {
        const hasAnyQty = activeKeys.some(k => selectedMeasurementQuantities[k] && selectedMeasurementQuantities[k] !== '');
        if (hasAnyQty) {
          const total = activeKeys.reduce((sum, k) => {
            const val = parseInt(selectedMeasurementQuantities[k] || '0', 10);
            return sum + (isNaN(val) || val < 0 ? 0 : val);
          }, 0);
          setQuantity(total.toString());
        }
      }
    }
  }, [selectedMeasurementQuantities, selectedMeasurements, pricingType]);

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
    setIsCustomShipping(false);
    setCustomShippingAmount('');
    setIsAddingGroup(false);
    setIsAddingCategory(false);
    setNewGroupName('');
    setNewCategoryName('');
    setRequiresMinShipping(false);
    setMinShippingQty('0');
    setPricingType('standard');
    setSelectedMeasurements({});
    setSelectedMeasurementCosts({});
    setSelectedMeasurementQuantities({});
    setCustomPortions([]);
    setNewCustomPortionInput('');
    setIsAddingCustomPortion(false);
    setImages([]);
    setImageUrlInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error('Food name is required.');
    if (!group) return toast.error('Please select a group.');
    if (!category) return toast.error('Please select a category.');
    if (!size && !isCustomShipping) return toast.error('Please select a product size for shipping.');
    if (images.length === 0) return toast.error('Please add at least one image');

    let parsedCost = parseFloat(costPrice.replace(/,/g, '')) || 0;
    let parsedPrice = parseFloat(price.replace(/,/g, '')) || 0;
    let parsedQty = parseInt(quantity, 10) || 0;

    const cleanMeasurements: Record<string, number> = {};
    const cleanCosts: Record<string, number> = {};
    const cleanQuantities: Record<string, number> = {};

    if (pricingType === 'standard') {
      if (!costPrice.trim()) return toast.error('Cost price is required.');
      if (!price.trim()) return toast.error('Selling price is required.');
      if (parsedCost >= parsedPrice) {
        return toast.error('Cost Price cannot be higher or equal to Selling Price.');
      }
    } else {
      // Validate multi-tier / packaging options
      if (pricingType === 'bags') {
        if (!costPrice.trim()) return toast.error('1 Bag Cost Price is required.');
        if (!price.trim()) return toast.error('1 Bag Selling Price is required.');
        if (parsedCost >= parsedPrice) {
          return toast.error('1 Bag Cost Price cannot be higher or equal to Selling Price.');
        }
        // Save 1 bag into measurements
        cleanMeasurements['1 bag'] = parsedPrice;
        if (parsedCost > 0) cleanCosts['1 bag'] = parsedCost;
        if (parsedQty > 0) cleanQuantities['1 bag'] = parsedQty;
      }

      // Check all configured measurements
      const configuredKeys = Object.keys(selectedMeasurements).filter(
        k => (pricingType === 'bags' && k === '1 bag') ? false : (selectedMeasurements[k] && selectedMeasurements[k].trim() !== '')
      );

      if (pricingType !== 'bags' && configuredKeys.length === 0) {
        return toast.error('Please provide at least one selling price for the selected packaging type.');
      }

      for (const mName of configuredKeys) {
        const mSell = parseFloat((selectedMeasurements[mName] || '').replace(/,/g, '')) || 0;
        let mCost = parseFloat((selectedMeasurementCosts[mName] || '').replace(/,/g, '')) || 0;
        const mQtyStr = selectedMeasurementQuantities[mName];
        const mQty = mQtyStr !== undefined && mQtyStr !== '' ? parseInt(mQtyStr, 10) : null;

        if (mSell < 1) {
          return toast.error(`Please enter a valid selling price (minimum ₦1) for "${mName}".`);
        }

        const isHalfPortion = mName.toLowerCase().includes('half') || mName.toLowerCase().includes('1/2');
        const isQuarterPortion = mName.toLowerCase().includes('quarter') || mName.toLowerCase().includes('1/4');

        // If user didn't enter a cost price for this variant, auto-estimate a smart cost
        if (mCost <= 0) {
          if (isHalfPortion) {
            const parentKey = configuredKeys.find(k => (
              k.toLowerCase().includes('full') || k === '1 bag' || k.toLowerCase().includes('carton')
            ));
            const parentCost = parentKey ? (parseFloat((selectedMeasurementCosts[parentKey] || '').replace(/,/g, '')) || parsedCost) : parsedCost;
            mCost = parentCost > 0 ? Math.round(parentCost * 0.5) : Math.round(mSell * 0.7);
          } else if (isQuarterPortion) {
            mCost = parsedCost > 0 ? Math.round(parsedCost * 0.25) : Math.round(mSell * 0.7);
          } else if (parsedCost > 0 && parsedPrice > 0) {
            const ratio = Math.min(0.9, parsedCost / parsedPrice);
            mCost = Math.round(mSell * ratio);
          } else {
            mCost = Math.round(mSell * 0.7);
          }
        }

        // If user entered a cost that is >= selling price (e.g. entered whole crate cost 4,450 for half crate selling for 3,000)
        if (mCost >= mSell) {
          if (isHalfPortion && Math.round(mCost * 0.5) < mSell) {
            mCost = Math.round(mCost * 0.5);
          } else if (isQuarterPortion && Math.round(mCost * 0.25) < mSell) {
            mCost = Math.round(mCost * 0.25);
          } else {
            // Auto-adjust gracefully so cost is strictly less than selling price
            mCost = Math.max(1, Math.round(mSell * 0.75));
          }
        }

        // Guarantee cost is strictly less than selling price and at least 1
        if (mCost >= mSell) {
          mCost = Math.max(1, mSell - 50);
        }

        if (mQty !== null && (isNaN(mQty) || mQty < 0)) {
          return toast.error(`Quantity for "${mName}" must be 0 or more.`);
        }

        cleanMeasurements[mName] = mSell;
        cleanCosts[mName] = mCost;
        if (mQty !== null) cleanQuantities[mName] = mQty;
      }

      // Set base price and costPrice from primary measurement if not bags
      if (pricingType !== 'bags') {
        const firstKey = configuredKeys[0];
        parsedPrice = cleanMeasurements[firstKey] || parsedPrice;
        parsedCost = cleanCosts[firstKey] || parsedCost;
      }

      // If quantities were entered per measurement, update base product quantity to the sum
      const totalVariantsQty = Object.values(cleanQuantities).reduce((sum, q) => sum + (q || 0), 0);
      if (totalVariantsQty > 0) {
        parsedQty = totalVariantsQty;
      }
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
        quantity: parsedQty,
        size: size || 'medium',
        customShippingAmount: isCustomShipping && customShippingAmount ? Number(parsePriceInput(customShippingAmount)) : null,
        measurements: Object.keys(cleanMeasurements).length > 0 ? JSON.stringify(cleanMeasurements) : '',
        measurementCostPrices: Object.keys(cleanCosts).length > 0 ? JSON.stringify(cleanCosts) : '',
        measurementQuantities: Object.keys(cleanQuantities).length > 0 ? JSON.stringify(cleanQuantities) : '',
        requiresMinShipping,
        minShippingQty: requiresMinShipping ? Number(minShippingQty) : 0,
        images: uploadedUrls,
        updatedAt: new Date().toISOString(),
        vendor: user?.email || '',
      };

      if (editingId) {
        const existingFood = foods.find(f => f.id === editingId);
        const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/FOODS'));
        if (!hasFullAccess && existingFood && (existingFood as any).vendor && (existingFood as any).vendor !== user?.email) {
          toast.error('You can only edit your own items.');
          setLoading(false);
          return;
        }
        await updateDoc(doc(db, 'foods', editingId), { ...foodData, isNewItem: false });
        toast.success('Food updated!');
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
    const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/FOODS'));
    if (!hasFullAccess && (food as any).vendor && (food as any).vendor !== user?.email) {
      toast.error('You can only edit your own items.');
      return;
    }
    setEditingId(food.id);
    setName(food.name);
    setCostPrice(formatPriceInput((food.costPrice || 0).toString()));
    setPrice(formatPriceInput((food.price || 0).toString()));
    setDescription(food.description || '');
    setGroup(food.group || '');
    setCategory(food.category || '');
    setQuantity(food.quantity?.toString() || '1');
    setSize(food.size || '');
    setIsCustomShipping(!!(food as any).customShippingAmount);
    setCustomShippingAmount((food as any).customShippingAmount ? formatPriceInput((food as any).customShippingAmount.toString()) : '');
    setRequiresMinShipping(food.requiresMinShipping || false);
    setMinShippingQty(food.minShippingQty?.toString() || '0');

    // Load measurements if they exist
    const foodMeasurements = (food as any).measurements;
    if (foodMeasurements) {
      try {
        const parsed = JSON.parse(foodMeasurements);
        const mObj: Record<string, string> = {};
        Object.entries(parsed).forEach(([k, v]) => {
          mObj[k] = formatPriceInput(String(v));
        });

        // Migrate old egg measurements ('Big', 'Medium', 'Small') to Full Crates
        const eggMigrationMap: Record<string, string> = {
          'Big': 'Big - Full Crate (30 Eggs)',
          'Medium': 'Medium - Full Crate (30 Eggs)',
          'Small': 'Small - Full Crate (30 Eggs)',
        };
        Object.entries(eggMigrationMap).forEach(([oldK, newK]) => {
          if (oldK in mObj && !(newK in mObj)) {
            mObj[newK] = mObj[oldK];
            delete mObj[oldK];
          }
        });

        setSelectedMeasurements(mObj);

        // Detect pricing type
        const keys = Object.keys(mObj);
        const keysLower = keys.join(' ').toLowerCase();
        if (keysLower.includes('crate') || keysLower.includes('egg') || keys.some(k => ['Big', 'Medium', 'Small'].includes(k))) {
          setPricingType('crates');
        } else if (keysLower.includes('tin') || keysLower.includes('sachet') || keysLower.includes('roll')) {
          setPricingType('tins');
        } else if (keysLower.includes('carton') || keysLower.includes('pack')) {
          setPricingType('cartons');
        } else if (keysLower.includes('kg')) {
          setPricingType('weight');
        } else if (keysLower.includes('tuber') || keysLower.includes('heap') || keysLower.includes('bunch')) {
          setPricingType('tubers');
        } else if (keysLower.includes('bag') || keysLower.includes('mudu') || keysLower.includes('congo') || keysLower.includes('paint rubber') || keysLower.includes('cup')) {
          setPricingType('bags');
        } else {
          setPricingType('custom');
          setCustomPortions(keys);
        }
      } catch {
        const mObj: Record<string, string> = {};
        foodMeasurements.split(', ').forEach((m: string) => {
          if (m) mObj[m] = '';
        });
        setSelectedMeasurements(mObj);
        setPricingType('bags');
      }

      const foodMeasurementCosts = (food as any).measurementCostPrices;
      if (foodMeasurementCosts) {
        try {
          const parsedCosts = JSON.parse(foodMeasurementCosts);
          const costObj: Record<string, string> = {};
          Object.entries(parsedCosts).forEach(([k, v]) => {
            costObj[k] = formatPriceInput(String(v));
          });

          // Migrate old egg costs to Full Crate
          const eggCostMigrationMap: Record<string, string> = {
            'Big': 'Big - Full Crate (30 Eggs)',
            'Medium': 'Medium - Full Crate (30 Eggs)',
            'Small': 'Small - Full Crate (30 Eggs)',
          };
          Object.entries(eggCostMigrationMap).forEach(([oldK, newK]) => {
            if (oldK in costObj && !(newK in costObj)) {
              costObj[newK] = costObj[oldK];
              delete costObj[oldK];
            }
          });

          // Automatically sanitize any old stored costs on half portions that were set >= selling price
          Object.keys(costObj).forEach((k) => {
            const costVal = parseFloat((costObj[k] || '').replace(/,/g, '')) || 0;
            const sellVal = parseFloat((selectedMeasurements[k] || '').replace(/,/g, '')) || 0;
            if (costVal > 0 && sellVal > 0 && costVal >= sellVal) {
              if (k.toLowerCase().includes('half') || k.toLowerCase().includes('1/2')) {
                costObj[k] = formatPriceInput(String(Math.round(costVal * 0.5) < sellVal ? Math.round(costVal * 0.5) : Math.round(sellVal * 0.7)));
              } else {
                costObj[k] = formatPriceInput(String(Math.round(sellVal * 0.75)));
              }
            }
          });

          setSelectedMeasurementCosts(costObj);
        } catch {
          setSelectedMeasurementCosts({});
        }
      } else {
        setSelectedMeasurementCosts({});
      }

      const foodMeasurementQuantities = (food as any).measurementQuantities;
      if (foodMeasurementQuantities) {
        try {
          const parsedQty = typeof foodMeasurementQuantities === 'string' ? JSON.parse(foodMeasurementQuantities) : foodMeasurementQuantities;
          const qtyObj: Record<string, string> = {};
          Object.entries(parsedQty).forEach(([k, v]) => {
            qtyObj[k] = String(v);
          });

          // Migrate old egg quantities to Full Crate
          const eggQtyMigrationMap: Record<string, string> = {
            'Big': 'Big - Full Crate (30 Eggs)',
            'Medium': 'Medium - Full Crate (30 Eggs)',
            'Small': 'Small - Full Crate (30 Eggs)',
          };
          Object.entries(eggQtyMigrationMap).forEach(([oldK, newK]) => {
            if (oldK in qtyObj && !(newK in qtyObj)) {
              qtyObj[newK] = qtyObj[oldK];
              delete qtyObj[oldK];
            }
          });

          setSelectedMeasurementQuantities(qtyObj);
        } catch {
          setSelectedMeasurementQuantities({});
        }
      } else {
        setSelectedMeasurementQuantities({});
      }
    } else {
      setPricingType('standard');
      setSelectedMeasurements({});
      setSelectedMeasurementCosts({});
      setSelectedMeasurementQuantities({});
      setCustomPortions([]);
    }

    setImages((food.images || []).map(url => ({ type: 'url', value: url })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!foodToDelete) return;
    const existingFood = foods.find(f => f.id === foodToDelete);
    const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/FOODS'));
    if (!hasFullAccess && existingFood && (existingFood as any).vendor && (existingFood as any).vendor !== user?.email) {
      toast.error('You can only delete your own items.');
      setFoodToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      const imagesToDelete: string[] = [];
      if (existingFood?.images && Array.isArray(existingFood.images)) {
        imagesToDelete.push(...existingFood.images);
      }
      if ((existingFood as any)?.image && typeof (existingFood as any).image === 'string') {
        imagesToDelete.push((existingFood as any).image);
      }
      
      await deleteDoc(doc(db, 'foods', foodToDelete));
      
      if (imagesToDelete.length > 0) {
        deleteImagesFromCloudinary(imagesToDelete).catch(console.error);
      }
      
      toast.success('Food deleted.');
    } catch (error) {
      toast.error('Failed to delete.');
    } finally {
      setIsDeleting(false);
      setFoodToDelete(null);
    }
  };

  const hasFullAccess = isCEO || (adminData?.vip && adminData?.assignedRoutes?.includes('/ADMIN/FOODS'));
  const visibleFoods = hasFullAccess ? foods : foods.filter(f => (f as any).vendor === user?.email);

  const baseFilteredFoods = visibleFoods.filter(food => {
    if (filterGroup === 'Low Stock') return (food.quantity ?? 0) <= 5;
    if (filterGroup === 'All') return true;
    return food.group?.toLowerCase() === filterGroup.toLowerCase();
  });

  const filteredFoods = (() => {
    if (!searchQuery.trim()) return baseFilteredFoods;
    const fuse = new Fuse(baseFilteredFoods, {
      keys: ['name', 'group', 'category', 'productCode'],
      threshold: 0.1,
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
              <FaUtensils className="text-green-600" /> Food Market Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage food items in your market.</p>
          </div>
          <div className="flex gap-3 items-center w-full md:w-auto">
          </div>
        </header>

        {/* Form Section */}
        <section className="bg-card p-4 md:p-8 rounded-[var(--radius)] border border-border shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-6">{editingId ? 'Edit Food' : 'Add New Food'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Food Name & Packaging / Pricing Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold">Food Name</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  type="text"
                  placeholder="e.g. 50kg Bag of Foreign Rice, Fresh Farm Eggs, Peak Milk, Milo..."
                  className="w-full p-3 rounded-md border border-border bg-background text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-primary flex items-center justify-between">
                  <span>Pricing & Packaging Type</span>
                </label>
                <select
                  value={pricingType}
                  onChange={(e) => {
                    const nextType = e.target.value as any;
                    setPricingType(nextType);
                    if (nextType === 'standard') {
                      setSelectedMeasurements({});
                      setSelectedMeasurementCosts({});
                      setSelectedMeasurementQuantities({});
                    }
                  }}
                  className="w-full p-3 rounded-md border border-primary/50 bg-primary/5 text-sm font-bold focus:border-primary outline-none"
                >
                  <option value="standard">Standard / Single Item (Others)</option>
                  <option value="bags">Bags & Market Portions (Rice, Beans, Garri...)</option>
                  <option value="crates">Egg Crates (Big, Medium, Small)</option>
                  <option value="tins">Tins & Cans (Milk, Powder, Milo, Pastes...)</option>
                  <option value="cartons">Cartons & Packs (Indomie, Drinks, Pasta...)</option>
                  <option value="weight">Weight in Kg (Meat, Fish, Chicken, Veggies...)</option>
                  <option value="tubers">Tubers & Heaps (Yam, Sweet Potato, Plantain...)</option>
                  <option value="custom">Custom Packaging & Portions</option>
                </select>
              </div>
            </div>

            {/* Dynamic Pricing & Packaging Section */}
            <div className="mb-6 p-4 rounded-xl border border-border bg-card/60 space-y-4">
              {/* Type 1: Standard / Single Item */}
              {pricingType === 'standard' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-red-700">Cost Price (₦)</label>
                    <input
                      required
                      value={costPrice}
                      onChange={e => setCostPrice(formatPriceInput(e.target.value))}
                      type="text"
                      placeholder="e.g. 2,000"
                      className="w-full p-2.5 rounded-md border border-red-200 bg-background text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-green-700 flex justify-between items-center">
                      <span>Selling Price (₦)</span>
                      {costPrice.trim() !== '' && price.trim() !== '' && (parseFloat(costPrice.replace(/,/g, '')) || 0) >= (parseFloat(price.replace(/,/g, '')) || 0) && (
                        <span className="text-[10px] text-red-500 font-bold animate-pulse">⚠️ Cost cannot be ≥ Selling</span>
                      )}
                    </label>
                    <input
                      required
                      value={price}
                      onChange={e => setPrice(formatPriceInput(e.target.value))}
                      type="text"
                      placeholder="e.g. 3,500"
                      className={`w-full p-2.5 rounded-md border text-sm font-bold outline-none transition-all ${
                        costPrice.trim() !== '' && price.trim() !== '' && (parseFloat(costPrice.replace(/,/g, '')) || 0) >= (parseFloat(price.replace(/,/g, '')) || 0)
                          ? 'border-red-500 focus:border-red-600 ring-2 ring-red-100'
                          : 'border-green-300 bg-background'
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Available Stock / Quantity</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full p-2.5 rounded-md border border-border bg-background text-sm font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Type 2: Bags & Market Portions */}
              {pricingType === 'bags' && (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50/60 border border-green-200 rounded-lg">
                    <p className="text-xs font-bold text-green-900 mb-2">Base Unit: 1 Bag Pricing & Stock</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-red-700 block mb-1">1 Bag Cost Price (₦)</label>
                        <input
                          required
                          value={costPrice}
                          onChange={e => setCostPrice(formatPriceInput(e.target.value))}
                          type="text"
                          placeholder="e.g. 75,000"
                          className="w-full p-2 rounded border border-red-200 bg-white text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-green-700 block mb-1">1 Bag Selling Price (₦)</label>
                        <input
                          required
                          value={price}
                          onChange={e => setPrice(formatPriceInput(e.target.value))}
                          type="text"
                          placeholder="e.g. 85,000"
                          className="w-full p-2 rounded border border-green-300 bg-white text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-muted-foreground block mb-1">1 Bag Available Stock Qty</label>
                        <input
                          required
                          type="number"
                          min="0"
                          value={quantity}
                          onChange={e => setQuantity(e.target.value)}
                          placeholder="e.g. 15"
                          className="w-full p-2 rounded border border-border bg-white text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-bold text-foreground">Sub-Portions & Other Bag Sizes (Tick to activate)</p>
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomPortion(!isAddingCustomPortion)}
                        className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1"
                      >
                        <FaPlus size={9} /> {isAddingCustomPortion ? 'Cancel' : 'Add Custom Portion (e.g. Derica)'}
                      </button>
                    </div>

                    {isAddingCustomPortion && (
                      <div className="flex gap-2 mb-3">
                        <input
                          placeholder="Portion name (e.g. 1 Derica, Big Heap)..."
                          value={newCustomPortionInput}
                          onChange={e => setNewCustomPortionInput(e.target.value)}
                          className="flex-1 p-2 rounded border border-primary text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newCustomPortionInput.trim()) {
                              const trimmed = newCustomPortionInput.trim();
                              if (!customPortions.includes(trimmed) && !bagPortionPresets.includes(trimmed)) {
                                setCustomPortions([...customPortions, trimmed]);
                                toggleMeasurement(trimmed);
                              }
                              setNewCustomPortionInput('');
                              setIsAddingCustomPortion(false);
                            }
                          }}
                          className="bg-primary text-white px-3 py-1.5 rounded text-xs font-bold"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {[...bagPortionPresets, ...customPortions].map(m => (
                        <div
                          key={`bag-${m}`}
                          className={`p-2.5 rounded-lg border text-xs transition-all ${
                            m in selectedMeasurements ? 'border-green-500 bg-green-50/70 shadow-sm' : 'border-border bg-background'
                          }`}
                        >
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleMeasurement(m)}>
                            <input
                              type="checkbox"
                              checked={m in selectedMeasurements}
                              readOnly
                              className="accent-green-600 pointer-events-none"
                            />
                            <span className="font-bold">{m}</span>
                          </div>
                          {m in selectedMeasurements && (
                            <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-green-200/60 animate-in fade-in duration-200">
                              <div>
                                <label className="text-[9px] font-bold text-green-800 block">Sell (₦)</label>
                                <input
                                  type="text"
                                  placeholder="Sell"
                                  value={selectedMeasurements[m]}
                                  onChange={e => setMeasurementPrice(m, formatPriceInput(e.target.value))}
                                  className="w-full p-1 rounded border border-green-300 bg-white text-[11px] font-bold focus:border-green-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-amber-700 block">Cost (₦) <span className="opacity-70 font-normal">(Opt)</span></label>
                                <input
                                  type="text"
                                  placeholder="Auto"
                                  value={selectedMeasurementCosts[m] || ''}
                                  onChange={e => setMeasurementCost(m, formatPriceInput(e.target.value))}
                                  className="w-full p-1 rounded border border-amber-300 bg-white text-[11px] font-bold focus:border-amber-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-blue-700 block">Qty (Stock)</label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Qty"
                                  value={selectedMeasurementQuantities[m] || ''}
                                  onChange={e => setMeasurementQuantity(m, e.target.value)}
                                  className="w-full p-1 rounded border border-blue-300 bg-white text-[11px] font-bold focus:border-blue-500 outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Type 3: Egg Crates (Big, Medium, Small - with Full Crate & Half Crate) */}
              {pricingType === 'crates' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FaEgg className="text-amber-600 size-4" />
                      <span className="text-xs font-bold text-amber-900">
                        Egg Crate Management (Enter prices for sizes you sell)
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
                      Total Crates in Stock: {quantity || '0'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {eggSizes.map(egg => {
                      const fullKey = `${egg.prefix} - Full Crate (30 Eggs)`;
                      const halfKey = `${egg.prefix} - Half Crate (15 Eggs)`;
                      return (
                        <div key={egg.prefix} className="border border-border rounded-xl p-3.5 bg-background shadow-xs space-y-3">
                          <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground pb-1.5 border-b border-border">
                            <FaEgg className="text-amber-500 size-3" />
                            {egg.label}
                          </h4>

                          {/* Full Crate Option */}
                          <div className={`p-2 rounded-lg border text-xs transition-all ${
                            fullKey in selectedMeasurements ? 'border-amber-400 bg-amber-50/50' : 'border-border/60 bg-muted/20'
                          }`}>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleMeasurement(fullKey)}>
                              <input
                                type="checkbox"
                                checked={fullKey in selectedMeasurements}
                                readOnly
                                className="accent-amber-600 pointer-events-none"
                              />
                              <span className="font-bold text-[11px]">Full Crate (30 Eggs)</span>
                            </div>
                            {fullKey in selectedMeasurements && (
                              <div className="grid grid-cols-3 gap-1.5 mt-2 pt-1.5 border-t border-amber-200/60">
                                <div>
                                  <label className="text-[9px] font-bold text-green-800 block">Sell (₦)</label>
                                  <input
                                    type="text"
                                    placeholder="Sell"
                                    value={selectedMeasurements[fullKey]}
                                    onChange={e => setMeasurementPrice(fullKey, formatPriceInput(e.target.value))}
                                    className="w-full p-1 rounded border border-green-300 bg-white text-[11px] font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-amber-700 block">Cost (₦) <span className="opacity-70 font-normal">(Opt)</span></label>
                                  <input
                                    type="text"
                                    placeholder="Cost"
                                    value={selectedMeasurementCosts[fullKey] || ''}
                                    onChange={e => setMeasurementCost(fullKey, formatPriceInput(e.target.value))}
                                    className="w-full p-1 rounded border border-amber-300 bg-white text-[11px] font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-blue-700 block">Qty</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Qty"
                                    value={selectedMeasurementQuantities[fullKey] || ''}
                                    onChange={e => setMeasurementQuantity(fullKey, e.target.value)}
                                    className="w-full p-1 rounded border border-blue-300 bg-white text-[11px] font-bold"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Half Crate Option */}
                          <div className={`p-2 rounded-lg border text-xs transition-all ${
                            halfKey in selectedMeasurements ? 'border-amber-400 bg-amber-50/50' : 'border-border/60 bg-muted/20'
                          }`}>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleMeasurement(halfKey)}>
                              <input
                                type="checkbox"
                                checked={halfKey in selectedMeasurements}
                                readOnly
                                className="accent-amber-600 pointer-events-none"
                              />
                              <span className="font-bold text-[11px]">Half Crate (15 Eggs)</span>
                            </div>
                            {halfKey in selectedMeasurements && (
                              <div className="grid grid-cols-3 gap-1.5 mt-2 pt-1.5 border-t border-amber-200/60">
                                <div>
                                  <label className="text-[9px] font-bold text-green-800 block">Sell (₦)</label>
                                  <input
                                    type="text"
                                    placeholder="Sell"
                                    value={selectedMeasurements[halfKey]}
                                    onChange={e => setMeasurementPrice(halfKey, formatPriceInput(e.target.value))}
                                    className="w-full p-1 rounded border border-green-300 bg-white text-[11px] font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-amber-700 block">Cost (₦) <span className="opacity-70 font-normal">(Opt)</span></label>
                                  <input
                                    type="text"
                                    placeholder="Auto"
                                    value={selectedMeasurementCosts[halfKey] || ''}
                                    onChange={e => setMeasurementCost(halfKey, formatPriceInput(e.target.value))}
                                    className="w-full p-1 rounded border border-amber-300 bg-white text-[11px] font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-blue-700 block">Qty</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Qty"
                                    value={selectedMeasurementQuantities[halfKey] || ''}
                                    onChange={e => setMeasurementQuantity(halfKey, e.target.value)}
                                    className="w-full p-1 rounded border border-blue-300 bg-white text-[11px] font-bold"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Type 4: Tins & Cans (Milk, Milo, Tomato Paste, Provisions) */}
              {pricingType === 'tins' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-foreground">Select Tin, Can, or Sachet Sizes Sold (Tick to activate)</p>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomPortion(!isAddingCustomPortion)}
                      className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <FaPlus size={9} /> {isAddingCustomPortion ? 'Cancel' : 'Add Custom Tin / Pack'}
                    </button>
                  </div>

                  {isAddingCustomPortion && (
                    <div className="flex gap-2 mb-3">
                      <input
                        placeholder="Size name (e.g. 500g Jar, Refill Pouch)..."
                        value={newCustomPortionInput}
                        onChange={e => setNewCustomPortionInput(e.target.value)}
                        className="flex-1 p-2 rounded border border-primary text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCustomPortionInput.trim()) {
                            const trimmed = newCustomPortionInput.trim();
                            if (!customPortions.includes(trimmed) && !tinPresets.includes(trimmed)) {
                              setCustomPortions([...customPortions, trimmed]);
                              toggleMeasurement(trimmed);
                            }
                            setNewCustomPortionInput('');
                            setIsAddingCustomPortion(false);
                          }
                        }}
                        className="bg-primary text-white px-3 py-1.5 rounded text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {[...tinPresets, ...customPortions].map(m => (
                      <div
                        key={`tin-${m}`}
                        className={`p-2.5 rounded-lg border text-xs transition-all ${
                          m in selectedMeasurements ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleMeasurement(m)}>
                          <input
                            type="checkbox"
                            checked={m in selectedMeasurements}
                            readOnly
                            className="accent-primary pointer-events-none"
                          />
                          <span className="font-bold">{m}</span>
                        </div>
                        {m in selectedMeasurements && (
                          <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-primary/20 animate-in fade-in duration-200">
                            <div>
                              <label className="text-[9px] font-bold text-green-800 block">Sell (₦)</label>
                              <input
                                type="text"
                                placeholder="Sell"
                                value={selectedMeasurements[m]}
                                onChange={e => setMeasurementPrice(m, formatPriceInput(e.target.value))}
                                className="w-full p-1 rounded border border-green-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-amber-700 block">Cost (₦) <span className="opacity-70 font-normal">(Opt)</span></label>
                              <input
                                type="text"
                                placeholder="Auto"
                                value={selectedMeasurementCosts[m] || ''}
                                onChange={e => setMeasurementCost(m, formatPriceInput(e.target.value))}
                                className="w-full p-1 rounded border border-amber-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-blue-700 block">Qty</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Qty"
                                value={selectedMeasurementQuantities[m] || ''}
                                onChange={e => setMeasurementQuantity(m, e.target.value)}
                                className="w-full p-1 rounded border border-blue-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Type 5: Cartons & Packs */}
              {pricingType === 'cartons' && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-foreground">Select Carton & Pack Options (Tick to activate)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {cartonPresets.map(m => (
                      <div
                        key={`carton-${m}`}
                        className={`p-2.5 rounded-lg border text-xs transition-all ${
                          m in selectedMeasurements ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleMeasurement(m)}>
                          <input
                            type="checkbox"
                            checked={m in selectedMeasurements}
                            readOnly
                            className="accent-primary pointer-events-none"
                          />
                          <span className="font-bold">{m}</span>
                        </div>
                        {m in selectedMeasurements && (
                          <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-primary/20">
                            <div>
                              <label className="text-[9px] font-bold text-green-800 block">Sell (₦)</label>
                              <input
                                type="text"
                                placeholder="Sell"
                                value={selectedMeasurements[m]}
                                onChange={e => setMeasurementPrice(m, formatPriceInput(e.target.value))}
                                className="w-full p-1 rounded border border-green-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-amber-700 block">Cost (₦) <span className="opacity-70 font-normal">(Opt)</span></label>
                              <input
                                type="text"
                                placeholder="Auto"
                                value={selectedMeasurementCosts[m] || ''}
                                onChange={e => setMeasurementCost(m, formatPriceInput(e.target.value))}
                                className="w-full p-1 rounded border border-amber-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-blue-700 block">Qty</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Qty"
                                value={selectedMeasurementQuantities[m] || ''}
                                onChange={e => setMeasurementQuantity(m, e.target.value)}
                                className="w-full p-1 rounded border border-blue-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Type 6: Weight (Kg) */}
              {pricingType === 'weight' && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-foreground">Select Weight Options (Tick to activate)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {weightPresets.map(m => (
                      <div
                        key={`weight-${m}`}
                        className={`p-2.5 rounded-lg border text-xs transition-all ${
                          m in selectedMeasurements ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleMeasurement(m)}>
                          <input
                            type="checkbox"
                            checked={m in selectedMeasurements}
                            readOnly
                            className="accent-primary pointer-events-none"
                          />
                          <span className="font-bold">{m}</span>
                        </div>
                        {m in selectedMeasurements && (
                          <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-primary/20">
                            <div>
                              <label className="text-[9px] font-bold text-green-800 block">Sell (₦)</label>
                              <input
                                type="text"
                                placeholder="Sell"
                                value={selectedMeasurements[m]}
                                onChange={e => setMeasurementPrice(m, formatPriceInput(e.target.value))}
                                className="w-full p-1 rounded border border-green-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-amber-700 block">Cost (₦) <span className="opacity-70 font-normal">(Opt)</span></label>
                              <input
                                type="text"
                                placeholder="Auto"
                                value={selectedMeasurementCosts[m] || ''}
                                onChange={e => setMeasurementCost(m, formatPriceInput(e.target.value))}
                                className="w-full p-1 rounded border border-amber-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-blue-700 block">Qty</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Qty"
                                value={selectedMeasurementQuantities[m] || ''}
                                onChange={e => setMeasurementQuantity(m, e.target.value)}
                                className="w-full p-1 rounded border border-blue-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Type 7: Tubers & Heaps */}
              {pricingType === 'tubers' && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-foreground">Select Tuber / Heap Options (Tick to activate)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {tuberPresets.map(m => (
                      <div
                        key={`tuber-${m}`}
                        className={`p-2.5 rounded-lg border text-xs transition-all ${
                          m in selectedMeasurements ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleMeasurement(m)}>
                          <input
                            type="checkbox"
                            checked={m in selectedMeasurements}
                            readOnly
                            className="accent-primary pointer-events-none"
                          />
                          <span className="font-bold">{m}</span>
                        </div>
                        {m in selectedMeasurements && (
                          <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-primary/20">
                            <div>
                              <label className="text-[9px] font-bold text-green-800 block">Sell (₦)</label>
                              <input
                                type="text"
                                placeholder="Sell"
                                value={selectedMeasurements[m]}
                                onChange={e => setMeasurementPrice(m, formatPriceInput(e.target.value))}
                                className="w-full p-1 rounded border border-green-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-amber-700 block">Cost (₦) <span className="opacity-70 font-normal">(Opt)</span></label>
                              <input
                                type="text"
                                placeholder="Auto"
                                value={selectedMeasurementCosts[m] || ''}
                                onChange={e => setMeasurementCost(m, formatPriceInput(e.target.value))}
                                className="w-full p-1 rounded border border-amber-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-blue-700 block">Qty</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Qty"
                                value={selectedMeasurementQuantities[m] || ''}
                                onChange={e => setMeasurementQuantity(m, e.target.value)}
                                className="w-full p-1 rounded border border-blue-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Type 8: Custom Packaging */}
              {pricingType === 'custom' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-foreground">Custom Packaging / Measurement Options</p>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomPortion(!isAddingCustomPortion)}
                      className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <FaPlus size={9} /> Add New Measurement
                    </button>
                  </div>

                  {isAddingCustomPortion && (
                    <div className="flex gap-2 mb-3">
                      <input
                        placeholder="Name (e.g. 1 Bale, 1 Basket, 1 Pack)..."
                        value={newCustomPortionInput}
                        onChange={e => setNewCustomPortionInput(e.target.value)}
                        className="flex-1 p-2 rounded border border-primary text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCustomPortionInput.trim()) {
                            const trimmed = newCustomPortionInput.trim();
                            if (!customPortions.includes(trimmed)) {
                              setCustomPortions([...customPortions, trimmed]);
                              toggleMeasurement(trimmed);
                            }
                            setNewCustomPortionInput('');
                            setIsAddingCustomPortion(false);
                          }
                        }}
                        className="bg-primary text-white px-3 py-1.5 rounded text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {customPortions.length === 0 ? (
                    <div className="p-4 text-center border border-dashed rounded-lg text-xs text-muted-foreground">
                      No custom measurements added yet. Click &quot;Add New Measurement&quot; above to create one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {customPortions.map(m => (
                        <div key={`custom-${m}`} className="p-2.5 rounded-lg border border-primary bg-primary/5 text-xs shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-foreground">{m}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomPortions(customPortions.filter(x => x !== m));
                                toggleMeasurement(m);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FaTimes size={12} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-primary/20">
                            <div>
                              <label className="text-[9px] font-bold text-green-800 block">Sell (₦)</label>
                              <input
                                type="text"
                                placeholder="Sell"
                                value={selectedMeasurements[m] || ''}
                                onChange={e => setMeasurementPrice(m, formatPriceInput(e.target.value))}
                                className="w-full p-1 rounded border border-green-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-amber-700 block">Cost (₦) <span className="opacity-70 font-normal">(Opt)</span></label>
                              <input
                                type="text"
                                placeholder="Auto"
                                value={selectedMeasurementCosts[m] || ''}
                                onChange={e => setMeasurementCost(m, formatPriceInput(e.target.value))}
                                className="w-full p-1 rounded border border-amber-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-blue-700 block">Qty</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Qty"
                                value={selectedMeasurementQuantities[m] || ''}
                                onChange={e => setMeasurementQuantity(m, e.target.value)}
                                className="w-full p-1 rounded border border-blue-300 bg-white text-[11px] font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                  <option value="custom" className="text-green-700 font-bold">Customise Shipping Amount</option>
                </select>
                {isCustomShipping && (
                  <div className="mt-2 animate-[slideIn_0.2s_ease]">
                    <label className="text-[0.65rem] font-bold text-green-700 mb-1 block uppercase">Custom Shipping Amount (₦)</label>
                    <input
                      type="text"
                      required={isCustomShipping}
                      value={customShippingAmount}
                      onChange={(e) => setCustomShippingAmount(formatPriceInput(e.target.value))}
                      placeholder="e.g. 5,000"
                      className="w-full p-2 rounded-md border border-green-500/50 bg-background text-sm focus:border-green-600 outline-none transition-all font-bold"
                    />
                  </div>
                )}
              </div>
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
              <div className="max-w-[280px] space-y-2">
                <label className="text-xs md:text-sm font-bold text-green-700 flex flex-wrap items-center justify-between gap-1">
                  <span>Total Quantity In Stock</span>
                  {pricingType !== 'standard' && Object.keys(selectedMeasurements).length > 0 && (
                    <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                      Auto-calculated from packaging selections
                    </span>
                  )}
                </label>
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
                    min="0"
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
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <h2 className="text-xl md:text-2xl font-bold">Food Inventory ({filteredFoods.length})</h2>
              <VendorSalesHistory userEmail={user?.email || null} isCEO={isCEO} inventoryCollection="foods" allowAll />
            </div>
            <div className="flex flex-row gap-2 w-full md:w-auto items-center">
              <div className="relative flex-[2] w-full">
                <input
                  type="text"
                  placeholder="Search foods..."
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <FaSearch className="absolute left-3 top-3 text-muted-foreground size-3" />
              </div>
              <div className="relative flex-[1]">
                <select
                  className="w-full appearance-none pl-2 pr-6 py-2 rounded-md border border-border bg-background text-[10px] md:text-sm font-bold uppercase cursor-pointer"
                  value={filterGroup}
                  onChange={e => setFilterGroup(e.target.value)}
                >
                  <option value="All">Groups</option>
                  <option value="Low Stock">Low Stock (≤ 5)</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <FaChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 text-muted-foreground pointer-events-none" />
              </div>
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
