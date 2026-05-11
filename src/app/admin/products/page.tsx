'use client';

import { useState, useEffect } from 'react';
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
  onSnapshot
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaPlus, FaTrash, FaEdit, FaImage, FaLink, FaTimes, FaSearch, FaBox } from 'react-icons/fa';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';

const formatName = (str: string) => {
  return str.trim().replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const formatStructure = (str: string) => {
  return str.trim().toUpperCase();
};

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
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
  
  // Image State
  const [images, setImages] = useState<{ type: 'file' | 'url', value: string | File }[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  
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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      
      // Dynamically extract groups and categories from products to stay updated
      const newMap: Record<string, string[]> = { ...categoriesByGroup };
      const uniqueGroups = Array.from(new Set(prods.map((p: any) => p.group))).filter(Boolean);
      
      uniqueGroups.forEach((g: any) => {
        const groupUpper = g.toUpperCase();
        if (!newMap[groupUpper]) newMap[groupUpper] = [];
        const catsForGroup = Array.from(new Set(prods.filter((p: any) => p.group.toUpperCase() === groupUpper).map((p: any) => p.category.toUpperCase()))).filter(Boolean);
        newMap[groupUpper] = Array.from(new Set([...newMap[groupUpper], ...catsForGroup as string[]]));
      });

      setGroups(Array.from(new Set([...groups, ...uniqueGroups.map((g:any) => g.toUpperCase())])));
      setCategoriesByGroup(newMap);
    });

    return () => unsub();
  }, []);

  const handleAddImageUrl = () => {
    if (!imageUrlInput) return;
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
    setIsAddingGroup(false);
    setIsAddingCategory(false);
    setNewGroupName('');
    setNewCategoryName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
        
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        );
        const data = await res.json();
        return data.secure_url;
      }));

      const productData = {
        name: formatName(name),
        price: isPromo ? Number(oldPrice) : Number(price),
        description,
        group: formatStructure(group),
        category: formatStructure(category),
        quantity: Number(quantity),
        isPromo,
        oldPrice: isPromo ? Number(price) : null,
        images: uploadedUrls,
        image: uploadedUrls[0], // Main image
        manufacturer: 'Quick Choice', // Default or add to form
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), productData);
        toast.success('Product updated!');
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success('Product added!');
      }
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description);
    setGroup(product.group);
    setCategory(product.category);
    setQuantity(product.quantity.toString());
    setIsPromo(product.isPromo || false);
    // Logic: price (state) = original price, oldPrice (state) = promo price
    if (product.isPromo) {
      setPrice(product.oldPrice?.toString() || '');
      setOldPrice(product.price.toString());
    } else {
      setPrice(product.price.toString());
      setOldPrice('');
    }
    setImages(product.images.map((url: string) => ({ type: 'url', value: url })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Product deleted.');
    } catch (error) {
      toast.error('Failed to delete.');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = filterGroup === 'All' || p.group === filterGroup;
    return matchesSearch && matchesGroup;
  }).sort((a, b) => (b.isPromo ? 1 : 0) - (a.isPromo ? 1 : 0));

  return (
    <div className="space-y-8 md:space-y-12">
      <header className="px-4 md:px-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Product Management</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage your store inventory and promos.</p>
        </div>
      </header>

      {/* PRODUCT FORM */}
      <section className="bg-card p-4 md:p-8 md:rounded-[var(--radius)] border border-border shadow-sm">
        <h2 className="text-lg md:text-xl font-bold mb-6">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold">Product Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full p-3 rounded-md border border-border bg-background text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold">Price (₦)</label>
              <input required value={price} onChange={e => setPrice(e.target.value)} type="number" className="w-full p-3 rounded-md border border-border bg-background text-sm" />
            </div>
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
                    onClick={() => { if(newGroupName){ const formatted = formatStructure(newGroupName); setGroup(formatted); setGroups([...groups, formatted]); setIsAddingGroup(false); } }}
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
                      if(newCategoryName && group){ 
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
                <select 
                  required 
                  disabled={!group}
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  className="w-full p-3 rounded-md border border-border bg-background text-sm disabled:bg-muted"
                >
                  <option value="">{group ? 'Select Category' : 'Choose Group First'}</option>
                  {group && categoriesByGroup[group]?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold">Quantity In Stock</label>
              <input required value={quantity} onChange={e => setQuantity(e.target.value)} type="number" className="w-full p-3 rounded-md border border-border bg-background text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-bold">Promotion</label>
              <div className="pt-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                  <input type="checkbox" checked={isPromo} onChange={e => setIsPromo(e.target.checked)} className="size-4" />
                  Is Promo?
                </label>
              </div>
              {isPromo && (
                <div className="flex flex-row gap-4 animate-[slideIn_0.2s_ease] mt-2">
                  <div className="flex-1">
                    <label className="text-[0.65rem] font-bold block mb-1 text-muted-foreground uppercase">Old Price (Auto)</label>
                    <input readOnly value={price} type="number" className="w-full p-2 rounded-md border border-border bg-muted text-sm opacity-70" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[0.65rem] font-bold block mb-1 text-primary uppercase">New Promo Price (₦)</label>
                    <input required value={oldPrice} onChange={e => setOldPrice(e.target.value)} type="number" className="w-full p-2 rounded-md border border-primary bg-background text-sm font-bold" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs md:text-sm font-bold">Description</label>
            <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 rounded-md border border-border bg-background text-sm" />
          </div>

          {/* IMAGE SECTION */}
          <div className="space-y-4">
            <label className="text-xs md:text-sm font-bold">Product Images (Min 1, Max 4)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Paste Image URL..." 
                  className="flex-1 p-3 rounded-md border border-border bg-background text-xs"
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                />
                <button type="button" onClick={handleAddImageUrl} className="bg-muted p-3 rounded-md border border-border hover:bg-muted/80">
                  <FaLink />
                </button>
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
                <div key={i} className="relative w-24 h-24 rounded-md overflow-hidden border border-border group">
                  <Image 
                    src={img.type === 'url' ? (img.value as string) : URL.createObjectURL(img.value as File)} 
                    alt="preview" 
                    fill 
                    className="object-cover" 
                  />
                  <button 
                    type="button" 
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-primary text-white py-4 rounded-md font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {loading ? 'Processing...' : (editingId ? 'Update Product' : 'Add Product')}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="bg-muted px-8 py-4 rounded-md font-bold border border-border text-sm">Cancel</button>
            )}
          </div>
        </form>
      </section>

      {/* PRODUCT LIST & FILTERS */}
      <section className="space-y-6 md:space-y-8 px-4 md:px-0">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">Existing Products ({filteredProducts.length})</h2>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="relative group">
              <div className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 z-10 flex gap-2 transition-opacity">
                <button onClick={() => handleEdit(product)} className="bg-white text-blue-600 p-2 rounded-full shadow-md hover:bg-blue-50">
                  <FaEdit />
                </button>
                <button onClick={() => handleDelete(product.id)} className="bg-white text-red-600 p-2 rounded-full shadow-md hover:bg-red-50">
                  <FaTrash />
                </button>
              </div>
              <div className="pointer-events-none">
                <ProductCard product={product} />
              </div>
              <div className="absolute bottom-2 left-2 bg-primary/90 text-white px-2 py-1 rounded text-xs font-bold">
                Qty: {product.quantity}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
