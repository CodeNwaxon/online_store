"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Edit2, Trash2, X, Save } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  author: string;
  createdAt?: any;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: "",
    excerpt: "",
    content: "",
    imageUrl: "",
    author: "NomoStores Admin"
  });

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return alert("Title and content are required.");

    setLoading(true);
    try {
      if (editingId) {
        const postRef = doc(db, "blogs", editingId);
        await updateDoc(postRef, {
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          imageUrl: formData.imageUrl,
          author: formData.author,
        });
      } else {
        await addDoc(collection(db, "blogs"), {
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          imageUrl: formData.imageUrl,
          author: formData.author,
          createdAt: serverTimestamp(),
        });
      }

      // Reset form
      setEditingId(null);
      setFormData({ title: "", excerpt: "", content: "", imageUrl: "", author: "NomoStores Admin" });
      await fetchPosts();
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Failed to save post");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      imageUrl: post.imageUrl,
      author: post.author,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "blogs", id));
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
              setFormData({ title: "", excerpt: "", content: "", imageUrl: "", author: "NomoStores Admin" });
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
            <h2 className="text-xl font-semibold mb-4 border-b border-border pb-2">
              {editingId ? "Edit Post" : "Create New Post"}
            </h2>

            <div>
              <label className="block text-sm font-bold mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg max-md:rounded-md border border-border p-3 bg-background shadow-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Author</label>
              <input
                type="text"
                value={formData.author}
                onChange={e => setFormData({ ...formData, author: e.target.value })}
                className="w-full rounded-lg max-md:rounded-md border border-border p-3 bg-background shadow-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Image URL</label>
              <input
                type="text"
                value={formData.imageUrl}
                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full rounded-lg max-md:rounded-md border border-border p-3 bg-background shadow-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Excerpt (Short description)</label>
              <textarea
                value={formData.excerpt}
                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full rounded-lg max-md:rounded-md border border-border p-3 bg-background shadow-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all h-24 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Content (HTML allowed)</label>
              <textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full rounded-lg max-md:rounded-md border border-border p-3 bg-background shadow-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all h-64 font-mono text-sm resize-none"
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
              {posts.map(post => (
                <div key={post.id} className="bg-card border rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{post.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...'}</p>
                    <div className="text-xs text-muted-foreground mt-2">
                      Author: {post.author} • {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Draft'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(post)}
                      className="p-2 bg-secondary/50 text-foreground rounded-md hover:bg-secondary transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
