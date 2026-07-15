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
          description: store.slogan || `Shop premium cosmetics and beauty products from ${store.name} on Nomo Storez.`,
          openGraph: {
            title: `${store.name} | Nomo Storez`,
            description: store.slogan || `Shop premium cosmetics and beauty products from ${store.name} on Nomo Storez.`,
            images: store.banner ? [store.banner] : [],
          }
        };
      }
    } catch (err) {
      console.error('Error generating special store metadata:', err);
    }
  }

  // Default Cosmetics Metadata
  return {
    title: 'Cosmetics & Beauty | Nomo Storez',
    description: 'Discover our range of premium skincare, makeup, and beauty products on Nomo Storez.',
  };
}

export default function CosmeticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
