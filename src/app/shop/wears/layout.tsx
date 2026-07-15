import { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function generateMetadata({
  searchParams
}: {
  searchParams: { store?: string }
}): Promise<Metadata> {
  const storeSlug = searchParams?.store;

  if (storeSlug) {
    try {
      const q = query(collection(db, 'admins'), where('specialStore.slug', '==', storeSlug));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const store = snap.docs[0].data().specialStore;
        return {
          title: `${store.name} | Nomo Storez`,
          description: store.slogan || `Shop premium fashion from ${store.name} on Nomo Storez.`,
          openGraph: {
            title: `${store.name} | Nomo Storez`,
            description: store.slogan || `Shop premium fashion from ${store.name} on Nomo Storez.`,
            images: store.banner ? [store.banner] : [],
          }
        };
      }
    } catch (err) {
      console.error('Error generating special store metadata:', err);
    }
  }

  // Default Wears Metadata
  return {
    title: 'Fashion & Wears | Nomo Storez',
    description: 'Explore our collection of trendy clothing, shoes, and stylish accessories on Nomo Storez.',
  };
}

export default function WearsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
