"use client";

import { useEffect, useRef, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getBlogExpiryDate } from "@/lib/blogUtils";
import { uploadImageToCloudinary, deleteImagesFromCloudinary } from "@/actions/upload";
import { Edit2, Trash2, X, Save, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  author: string;
  tag?: string;
  createdAt?: any;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const [blogTags, setBlogTags] = useState<string[]>([]);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Form state
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: "",
    excerpt: "",
    content: "",
    imageUrl: "",
    author: "NomoStores Admin",
    tag: ""
  });

  const loadPhoneGuideSample = () => {
    setEditingId(null);
    setImageFile(null);
    setImagePreview('');
    if (imageInputRef.current) imageInputRef.current.value = '';
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

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : '');
    if (file) setFormData(current => ({ ...current, imageUrl: '' }));
  };

  const handleImageUrlChange = (value: string) => {
    setImageFile(null);
    setImagePreview('');
    if (imageInputRef.current) imageInputRef.current.value = '';
    setFormData(current => ({ ...current, imageUrl: value }));
  };

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
    let uploadedImageUrl = '';
    try {
      let imageUrl = formData.imageUrl || '';
      if (imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', imageFile);
        const uploadResult = await uploadImageToCloudinary(uploadFormData);
        imageUrl = uploadResult.secure_url;
        uploadedImageUrl = imageUrl;
      }

      if (editingId) {
        const postRef = doc(db, "blogs", editingId);
        await updateDoc(postRef, {
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          imageUrl,
          author: formData.author,
          tag: formData.tag || '',
        });
      } else {
        await addDoc(collection(db, "blogs"), {
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          imageUrl,
          author: formData.author,
          tag: formData.tag || '',
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(getBlogExpiryDate()),
        });
      }
      uploadedImageUrl = '';

      // Reset form
      setEditingId(null);
      setImageFile(null);
      setImagePreview('');
      if (imageInputRef.current) imageInputRef.current.value = '';
      setFormData({ title: "", excerpt: "", content: "", imageUrl: "", author: "NomoStores Admin", tag: "" });
      await fetchPosts();
    } catch (error) {
      console.error("Error saving post:", error);
      if (uploadedImageUrl) await deleteImagesFromCloudinary([uploadedImageUrl]);
      alert("Failed to save post");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setImageFile(null);
    setImagePreview('');
    if (imageInputRef.current) imageInputRef.current.value = '';
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      imageUrl: post.imageUrl,
      author: post.author,
      tag: post.tag || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setLoading(true);
    try {
      const postSnapshot = await getDoc(doc(db, "blogs", id));
      const imageUrl = postSnapshot.data()?.imageUrl;
      await deleteDoc(doc(db, "blogs", id));
      if (typeof imageUrl === 'string' && isCloudinaryImageUrl(imageUrl)) {
        await deleteImagesFromCloudinary([imageUrl]);
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Blog Posts</h1>
        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setImageFile(null);
              setImagePreview('');
              if (imageInputRef.current) imageInputRef.current.value = '';
              setFormData({ title: "", excerpt: "", content: "", imageUrl: "", author: "NomoStores Admin", tag: "" });
            }}
            className="flex items-center gap-2 bg-secondary text-white font-bold px-4 py-2 rounded-lg hover:bg-secondary/80 shadow-sm transition-colors"
          >
            <X size={16} /> Cancel Edit
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
              <label className="block text-sm font-bold mb-1">Blog tag</label>
              <div className="flex gap-2">
                <select
                  value={formData.tag || ''}
                  onChange={event => setFormData(current => ({ ...current, tag: event.target.value }))}
                  className="text-sm sm:text-base min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 md:p-3"
                >
                  <option value="">No tag</option>
                  {blogTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewTagInput(open => !open)}
                  className="shrink-0 rounded-md border border-primary/25 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10"
                >{showNewTagInput ? 'Cancel' : 'Add tag'}</button>
              </div>
              {showNewTagInput && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={event => setNewTagName(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && (event.preventDefault(), handleAddTag())}
                    placeholder="e.g. Phones & Electronics"
                    className="text-sm min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2"
                  />
                  <button type="button" onClick={handleAddTag} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90">Save tag</button>
                </div>
              )}
            </div>

            <div className="py-6 space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1">Image URL</label>
              <input
                type="text"
                value={formData.imageUrl}
                onChange={e => handleImageUrlChange(e.target.value)}
                className="text-sm sm:text-base w-full rounded-lg max-md:rounded-md border border-border px-3 py-2 md:p-3 bg-background shadow-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                placeholder="https://..."
              />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Or Upload Image</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold"
                />
                <p className="mt-1 text-xs text-muted-foreground">The image uploads to Cloudinary only when you publish or update the post.</p>
              </div>
              {(imagePreview || formData.imageUrl) && (
                <div className="overflow-hidden rounded-md border border-border bg-muted/30 p-2">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Image preview</p>
                  <img
                    src={imagePreview || formData.imageUrl}
                    alt="Blog image preview"
                    className="max-h-56 w-full rounded object-contain"
                  />
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
                      {post.imageUrl ? (
                        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md bg-muted sm:aspect-square sm:w-28">
                          <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex aspect-[16/10] w-full shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:aspect-square sm:w-28">
                          <FileText size={24} aria-hidden="true" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{post.author || 'NomoStores Admin'}</span>
                          <span aria-hidden="true">·</span>
                          <time>{publishedDate}</time>
                        </div>
                        <h3 className="text-lg font-bold leading-snug text-foreground">{post.title || 'Untitled post'}</h3>
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
                            View more
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
                            onClick={() => handleDelete(post.id)}
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
                          {post.imageUrl && (
                            <div className="max-h-[400px] overflow-hidden bg-muted">
                              <img src={post.imageUrl} alt={post.title} className="max-h-[400px] w-full object-cover" />
                            </div>
                          )}
                          <div className="px-1 py-5 sm:p-8">
                            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />{post.author || 'NomoStores Admin'}</span>
                              <time>{publishedDate}</time>
                            </div>
                            <h4 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">{post.title || 'Untitled post'}</h4>
                            {post.excerpt && <p className="mt-4 border-l-2 border-primary pl-4 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>}
                            <div
                              className="prose prose-lg mt-6 max-w-none space-y-6 text-foreground [&_a]:text-primary [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_p]:leading-relaxed"
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
