"use client";

import { useEffect, useRef, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getBlogExpiryDate } from "@/lib/blogUtils";
import { blogContentClasses } from "@/lib/blogContentStyles";
import { uploadImageToCloudinary, deleteImagesFromCloudinary } from "@/actions/upload";
import { Edit2, Trash2, X, Save, FileText, ChevronDown, ChevronUp, Plus, Image as ImageIcon } from "lucide-react";

export interface BlogImage {
  url: string;
  fullImage?: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl?: string;
  images?: BlogImage[];
  author: string;
  tag?: string;
  fullImage?: boolean;
  createdAt?: any;
}

interface FormImageItem {
  id: string;
  url: string;
  file: File | null;
  preview: string;
  fullImage: boolean;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formImages, setFormImages] = useState<FormImageItem[]>([]);
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const [blogTags, setBlogTags] = useState<string[]>([]);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ type: 'post'; id: string; label: string } | { type: 'tag'; tag: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tagInUse, setTagInUse] = useState<{ tag: string; titles: string[] } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: "",
    excerpt: "",
    content: "",
    imageUrl: "",
    author: "NomoStores Admin",
    tag: ""
  });

  const resetFormState = () => {
    setEditingId(null);
    formImages.forEach(item => {
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setFormImages([]);
    setFormData({
      title: "",
      excerpt: "",
      content: "",
      imageUrl: "",
      author: "NomoStores Admin",
      tag: ""
    });
  };

  const handleAddImageSlot = () => {
    if (formImages.length >= 4) return;
    setFormImages(prev => [
      ...prev,
      {
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        url: '',
        file: null,
        preview: '',
        fullImage: false
      }
    ]);
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const availableSlots = 4 - formImages.length;
    if (availableSlots <= 0) return;
    const filesToAdd = Array.from(files).slice(0, availableSlots);

    const newItems: FormImageItem[] = filesToAdd.map((file, idx) => ({
      id: `img-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      url: '',
      file,
      preview: URL.createObjectURL(file),
      fullImage: false
    }));

    setFormImages(prev => [...prev, ...newItems]);
  };

  const updateImageSlot = (id: string, updates: Partial<FormImageItem>) => {
    setFormImages(prev => prev.map(item => {
      if (item.id === id) {
        if (updates.file !== undefined && item.preview && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
        return { ...item, ...updates };
      }
      return item;
    }));
  };

  const removeImageSlot = (id: string) => {
    setFormImages(prev => {
      const target = prev.find(i => i.id === id);
      if (target?.preview && target.preview.startsWith('blob:')) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const loadPhoneGuideSample = () => {
    resetFormState();
    setFormData({
      title: "How to Choose the Right Smartphone: A Practical Buying Guide",
      author: "NomoStores Editorial",
      imageUrl: "",
      excerpt: "Choosing a new phone is easier when you focus on what matters most: performance, battery life, camera quality, storage, and a price that fits your budget.",
      content: `<article class="space-y-6 leading-relaxed">
  <p>A smartphone is something you use every day, so the best choice is not always the newest or most expensive model. Start with how you use your phone, then compare the features that make a real difference to you.</p>

  <h2 class="text-2xl font-bold">1. Choose performance that fits your routine</h2>
  <p>If you mainly browse, message, stream videos, and use social apps, a dependable everyday phone can be a great fit. If you play demanding games, edit videos, or switch between many apps, look for a stronger processor and more memory. Reading recent reviews can help you understand how a model performs outside the spec sheet.</p>

  <h2 class="text-2xl font-bold">2. Think about battery life and charging</h2>
  <p>Battery capacity is useful to compare, but it does not tell the whole story. Screen size, software, network signal, and your habits all affect how long a phone lasts. Check whether the phone supports the charging speed and charger type you need, and confirm what accessories are included before buying.</p>

  <h2 class="text-2xl font-bold">3. Pick a camera for the photos you take</h2>
  <p>More camera lenses do not automatically mean better pictures. Look for sample photos and reviews in the situations you care about, such as portraits, low light, or video. If you often take selfies or video calls, check the front camera as well as the rear cameras.</p>

  <h2 class="text-2xl font-bold">4. Get enough storage for your apps and files</h2>
  <p>Photos, videos, games, and app updates can use storage quickly. Choose a capacity that gives you room to grow. If a phone supports a memory card, check the supported card type and whether that option works for your needs.</p>

  <h2 class="text-2xl font-bold">5. Confirm network, condition, and after-sales details</h2>
  <p>Before ordering, confirm that the model works with your mobile network and that the product description matches the exact version you want. For a used phone, review the stated condition, battery information, included accessories, and return or warranty terms. Ask questions before checkout if any detail is unclear.</p>

  <h2 class="text-2xl font-bold">Make a confident choice</h2>
  <p>Set a budget, shortlist a few models, and compare the features you will actually use. Browse the phones and electronics available at NomoStores, then check each listing for its specifications, condition, price, and seller details before placing your order.</p>
</article>`,
    });
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
      const [querySnapshot, settingsSnapshot] = await Promise.all([
        getDocs(q),
        getDoc(doc(db, 'settings', 'general')),
      ]);
      setBlogTags(settingsSnapshot.data()?.blogTags || []);
      const fetchedPosts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlogPost[];
      setPosts(fetchedPosts);
    } catch (error) {
      console.error("Error fetching blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleAddTag = async () => {
    const normalizedTag = newTagName.trim().replace(/\s+/g, ' ');
    if (!normalizedTag) return;
    if (blogTags.some(tag => tag.toLowerCase() === normalizedTag.toLowerCase())) {
      setFormData(current => ({ ...current, tag: blogTags.find(tag => tag.toLowerCase() === normalizedTag.toLowerCase()) || normalizedTag }));
      setNewTagName('');
      setShowNewTagInput(false);
      return;
    }

    try {
      const updatedTags = [...blogTags, normalizedTag];
      await setDoc(doc(db, 'settings', 'general'), { blogTags: updatedTags }, { merge: true });
      setBlogTags(updatedTags);
      setFormData(current => ({ ...current, tag: normalizedTag }));
      setNewTagName('');
      setShowNewTagInput(false);
    } catch (error) {
      console.error('Failed to add blog tag:', error);
      alert('Failed to add blog tag');
    }
  };

  const handleDeleteTag = async (tag: string) => {
    const postsUsingTag = posts.filter(post => post.tag === tag);
    if (postsUsingTag.length > 0) {
      setTagInUse({ tag, titles: postsUsingTag.map(post => post.title || 'Untitled post') });
      return;
    }
    setTagInUse(null);
    setPendingDelete({ type: 'tag', tag, label: tag });
  };

  const performTagDelete = async (tag: string) => {
    try {
      const updatedTags = blogTags.filter(item => item !== tag);
      await setDoc(doc(db, 'settings', 'general'), { blogTags: updatedTags }, { merge: true });
      setBlogTags(updatedTags);
      setFormData(current => (current.tag === tag ? { ...current, tag: '' } : current));
    } catch (error) {
      console.error('Failed to delete blog tag:', error);
      alert('Failed to delete blog tag');
    }
  };

  const confirmPendingDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    if (pendingDelete.type === 'post') await handleDelete(pendingDelete.id);
    else await performTagDelete(pendingDelete.tag);
    setDeleting(false);
    setPendingDelete(null);
  };

  useEffect(() => {
    return () => {
      formImages.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [formImages]);

  const isCloudinaryImageUrl = (value: string) => {
    try {
      const url = new URL(value);
      return url.hostname === 'res.cloudinary.com' && url.pathname.includes('/image/upload/');
    } catch {
      return false;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return alert("Title and content are required.");

    setLoading(true);
    const newlyUploadedUrls: string[] = [];
    try {
      const finalImages: BlogImage[] = [];

      for (const item of formImages) {
        if (item.file) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', item.file);
          const uploadResult = await uploadImageToCloudinary(uploadFormData);
          const secureUrl = uploadResult.secure_url;
          newlyUploadedUrls.push(secureUrl);
          finalImages.push({
            url: secureUrl,
            fullImage: Boolean(item.fullImage),
          });
        } else if (item.url && item.url.trim()) {
          finalImages.push({
            url: item.url.trim(),
            fullImage: Boolean(item.fullImage),
          });
        }
      }

      const primaryImageUrl = finalImages[0]?.url || '';
      const primaryFullImage = Boolean(finalImages[0]?.fullImage);

      const postPayload = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        author: formData.author,
        tag: formData.tag || '',
        images: finalImages,
        imageUrl: primaryImageUrl,
        fullImage: primaryFullImage,
      };

      if (editingId) {
        const postRef = doc(db, "blogs", editingId);
        await updateDoc(postRef, postPayload);
      } else {
        await addDoc(collection(db, "blogs"), {
          ...postPayload,
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(getBlogExpiryDate()),
        });
      }

      resetFormState();
      await fetchPosts();
    } catch (error) {
      console.error("Error saving post:", error);
      if (newlyUploadedUrls.length > 0) {
        await deleteImagesFromCloudinary(newlyUploadedUrls);
      }
      alert("Failed to save post");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingId(post.id);
    formImages.forEach(item => {
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
    });

    const existingImages: BlogImage[] = (
      post.images && post.images.length > 0
        ? post.images
        : post.imageUrl
          ? [{ url: post.imageUrl, fullImage: Boolean(post.fullImage) }]
          : []
    ).slice(0, 4);

    setFormImages(existingImages.map((im, idx) => ({
      id: `img-${post.id}-${idx}`,
      url: im.url,
      file: null,
      preview: im.url,
      fullImage: Boolean(im.fullImage),
    })));

    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      imageUrl: post.imageUrl || '',
      author: post.author,
      tag: post.tag || '',
      fullImage: Boolean(post.fullImage),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const postSnapshot = await getDoc(doc(db, "blogs", id));
      const data = postSnapshot.data();
      const urlsToDelete: string[] = [];

      if (data?.imageUrl && isCloudinaryImageUrl(data.imageUrl)) {
        urlsToDelete.push(data.imageUrl);
      }
      if (Array.isArray(data?.images)) {
        for (const img of data.images) {
          if (img?.url && isCloudinaryImageUrl(img.url) && !urlsToDelete.includes(img.url)) {
            urlsToDelete.push(img.url);
          }
        }
      }

      await deleteDoc(doc(db, "blogs", id));
      if (urlsToDelete.length > 0) {
        await deleteImagesFromCloudinary(urlsToDelete);
      }
      await fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-1 md:px-4 py-8 max-w-6xl">
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 size={20} aria-hidden="true" />
              </span>
              <h2 id="delete-dialog-title" className="mt-3 text-lg font-bold text-foreground">
                {pendingDelete.type === 'post' ? 'Delete this post?' : 'Delete this tag?'}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="break-words font-semibold text-foreground">&ldquo;{pendingDelete.label}&rdquo;</span>{' '}
                will be permanently removed. This can&apos;t be undone.
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPendingDelete}
                disabled={deleting}
                className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Manage Blog Posts</h1>
        {editingId && (
          <button
            onClick={resetFormState}
            className="flex items-center gap-2 bg-secondary text-white font-bold px-4 py-2 rounded-lg hover:bg-secondary/80 shadow-sm transition-colors"
          >
            <X size={16} /> <span className="hidden md:block">Cancel Edit</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Area */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSave} className="bg-card rounded-xl max-md:rounded-md p-6 max-md:p-4 shadow-md sticky top-24 space-y-4">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-2">
              <h2 className="text-xl font-semibold">
                {editingId ? "Edit Post" : "Create New Post"}
              </h2>
              {!editingId && (
                <button
                  type="button"
                  onClick={loadPhoneGuideSample}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <FileText size={14} /> Load sample
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="text-sm sm:text-base w-full rounded-lg max-md:rounded-md border border-border px-3 py-2 md:p-3 bg-background shadow-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Author</label>
              <input
                type="text"
                value={formData.author}
                onChange={e => setFormData({ ...formData, author: e.target.value })}
                className="text-sm sm:text-base w-full rounded-lg max-md:rounded-md border border-border px-3 py-2 md:p-3 bg-background shadow-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-foreground">Blog Tag</label>
                {formData.tag && (
                  <button
                    type="button"
                    onClick={() => setFormData(current => ({ ...current, tag: '' }))}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {/* Displayed tags as selectable pills with scrollable container */}
              {blogTags.length > 0 ? (
                <div
                  className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto pr-1.5 p-1 rounded-md border border-border/50 bg-background/50 custom-scrollbar [scrollbar-width:thin] [scrollbar-color:#D48806_transparent]"
                  style={{ '--scrollbar-thumb': '#D48806' } as React.CSSProperties}
                >
                  {blogTags.map(tag => {
                    const isSelected = formData.tag === tag;
                    return (
                      <div
                        key={tag}
                        onClick={() => setFormData(current => ({ ...current, tag: current.tag === tag ? '' : tag }))}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all select-none ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm font-bold'
                            : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTag(tag);
                          }}
                          aria-label={`Delete tag ${tag}`}
                          title={`Delete tag ${tag}`}
                          className={`rounded p-0.5 transition-colors ${
                            isSelected
                              ? 'text-white/80 hover:text-white hover:bg-white/20'
                              : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                          }`}
                        >
                          <Trash2 size={11} aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-2">No tags created yet. Create one below.</p>
              )}

              {/* Input reserved for creating tags */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={event => setNewTagName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Create new tag (e.g. Phones & Tech)"
                  className="text-xs sm:text-sm min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity shrink-0"
                >
                  Add Tag
                </button>
              </div>

              {tagInUse && (
                <div role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      The tag &ldquo;{tagInUse.tag}&rdquo; is in use and can&apos;t be deleted.
                    </p>
                    <button type="button" onClick={() => setTagInUse(null)} aria-label="Dismiss" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted">
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Blogs using this tag:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm font-medium text-destructive">
                    {tagInUse.titles.map((title, index) => <li key={index}>{title}</li>)}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">Delete or re-tag these blogs first.</p>
                </div>
              )}
            </div>

            <div className="py-4 space-y-4 border-y border-border">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-bold text-foreground">Blog Images</label>
                  <p className="text-xs text-muted-foreground">Maximum images allowed (4).</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${formImages.length === 4 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                  {formImages.length}/4
                </span>
              </div>

              {/* Single "Upload photo" button */}
              {formImages.length < 4 && (
                <div>
                  <button
                    type="button"
                    onClick={handleAddImageSlot}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Plus size={14} /> Upload photo
                  </button>
                </div>
              )}

              {/* List of Image Slots */}
              {formImages.length > 0 && (
                <div className="space-y-3">
                  {formImages.map((item, index) => (
                    <div key={item.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <ImageIcon size={13} className="text-primary" /> Photo #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImageSlot(item.id)}
                          className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                          title="Remove photo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {/* File input */}
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                updateImageSlot(item.id, {
                                  file: f,
                                  url: '',
                                  preview: URL.createObjectURL(f)
                                });
                              }
                              e.target.value = '';
                            }}
                            className="w-full text-xs file:mr-2.5 file:rounded file:border-0 file:bg-primary/15 file:text-primary file:px-2.5 file:py-1.5 file:text-xs file:font-bold cursor-pointer"
                          />
                        </div>

                        {/* URL input */}
                        <div>
                          <input
                            type="text"
                            placeholder="Or paste image URL (https://...)"
                            value={item.url}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateImageSlot(item.id, {
                                url: val,
                                file: null,
                                preview: val
                              });
                            }}
                            className="text-xs w-full rounded-md border border-border px-2.5 py-1.5 bg-background outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      {/* Independent Full Image Toggle */}
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none">
                          <input
                            type="checkbox"
                            checked={item.fullImage}
                            onChange={(e) => updateImageSlot(item.id, { fullImage: e.target.checked })}
                            className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                          />
                          <span>Full Image</span>
                          <span className="text-[10px] font-normal text-muted-foreground">
                            ({item.fullImage ? 'object-contain' : 'object-cover'})
                          </span>
                        </label>
                      </div>

                      {/* Thumbnail Preview */}
                      {item.preview && (
                        <div className="relative h-32 w-full rounded overflow-hidden bg-black/10 border border-border flex items-center justify-center">
                          <img
                            src={item.preview}
                            alt={`Photo #${index + 1}`}
                            className={`w-full h-full ${item.fullImage ? 'object-contain' : 'object-cover'}`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Excerpt (Short description)</label>
              <textarea
                value={formData.excerpt}
                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                className="text-sm sm:text-base w-full rounded-lg max-md:rounded-md border border-border p-3 bg-background shadow-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all h-24 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Content (HTML allowed)</label>
              <textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="text-sm sm:text-base w-full rounded-lg max-md:rounded-md border border-border p-3 bg-background shadow-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all h-64 font-mono resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold p-3 rounded-lg max-md:rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save size={18} /> {loading ? "Saving..." : (editingId ? "Update Post" : "Publish Post")}
            </button>
          </form>
        </div>

        {/* List Area */}
        <div className="lg:col-span-2">
          {loading && posts.length === 0 ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
              No blog posts found. Create one using the form.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => {
                const isPreviewOpen = expandedPreviewId === post.id;
                const publishedDate = post.createdAt?.toDate
                  ? post.createdAt.toDate().toLocaleDateString()
                  : post.createdAt
                    ? new Date(post.createdAt).toLocaleDateString()
                    : 'Draft';

                return (
                  <article key={post.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
                      {(() => {
                        const postImages: BlogImage[] = (
                          post.images && post.images.length > 0
                            ? post.images
                            : post.imageUrl
                              ? [{ url: post.imageUrl, fullImage: post.fullImage }]
                              : []
                        ).slice(0, 4);

                        if (postImages.length > 0) {
                          return (
                            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md bg-muted sm:aspect-square sm:w-28">
                              <img src={postImages[0].url} alt="" className="h-full w-full object-cover" />
                              {postImages.length > 1 && (
                                <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                  +{postImages.length - 1}
                                </span>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="flex aspect-[16/10] w-full shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:aspect-square sm:w-28">
                            <FileText size={24} aria-hidden="true" />
                          </div>
                        );
                      })()}

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{post.author || 'NomoStores Admin'}</span>
                          <span aria-hidden="true">·</span>
                          <time>{publishedDate}</time>
                        </div>
                        <h3 className="text-base font-bold leading-snug sm:text-lg text-foreground">{post.title || 'Untitled post'}</h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 180) + '...'}
                        </p>

                        <div className="mt-4 grid grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedPreviewId(isPreviewOpen ? null : post.id)}
                            aria-expanded={isPreviewOpen}
                            className="col-span-2 inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-md border border-border px-1.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                          >
                            {isPreviewOpen ? 'View less' : 'View more'}
                            {isPreviewOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(post)}
                            aria-label={`Edit ${post.title || 'blog post'}`}
                            className="inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-md border border-primary/25 bg-primary/5 px-2 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                          >
                            <Edit2 size={14} aria-hidden="true" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete({ type: 'post', id: post.id, label: post.title || 'Untitled post' })}
                            aria-label={`Delete ${post.title || 'blog post'}`}
                            title="Delete post"
                            className="inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-md border border-destructive/25 px-2 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 sm:px-3"
                          >
                            <Trash2 size={14} aria-hidden="true" /> <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {isPreviewOpen && (
                      <div className="border-t border-border bg-muted/20 px-1 py-5 sm:px-6">
                        <div className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                          {(() => {
                            const previewImages: BlogImage[] = (
                              post.images && post.images.length > 0
                                ? post.images
                                : post.imageUrl
                                  ? [{ url: post.imageUrl, fullImage: post.fullImage }]
                                  : []
                            ).slice(0, 4);

                            if (previewImages.length === 0) return null;

                            return (
                              <div
                                className={`w-full overflow-hidden bg-black/5 p-1 ${previewImages.length === 1
                                  ? 'grid grid-cols-1'
                                  : 'grid grid-cols-2 gap-1.5'
                                  }`}
                              >
                                {previewImages.map((img, idx) => {
                                  const isSpan2 = previewImages.length === 3 && idx === 2;
                                  return (
                                    <div
                                      key={idx}
                                      className={`relative ${previewImages.length === 1
                                        ? 'max-h-[360px] h-64 sm:h-72'
                                        : isSpan2
                                          ? 'col-span-2 h-52 sm:h-64'
                                          : 'h-40 sm:h-48'
                                        } w-full overflow-hidden rounded bg-white dark:bg-slate-900`}
                                    >
                                      <img
                                        src={img.url}
                                        alt=""
                                        className={`w-full h-full ${img.fullImage ? 'object-contain' : 'object-cover'
                                          }`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                          <div className="px-1 py-5 sm:p-8">
                            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />{post.author || 'NomoStores Admin'}</span>
                              <time>{publishedDate}</time>
                            </div>
                            <h4 className="text-xl font-bold leading-tight text-foreground sm:text-3xl">{post.title || 'Untitled post'}</h4>
                            {post.excerpt && <p className="mt-4 border-l-2 border-primary pl-4 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>}
                            <div
                              className={`mt-6 max-w-none ${blogContentClasses}`}
                              dangerouslySetInnerHTML={{ __html: post.content }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
