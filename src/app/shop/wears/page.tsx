import { Metadata } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import WearsClient from './WearsClient';

type Props = {
  searchParams: Promise<{ store?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { store: storeSlug } = await searchParams;

  if (storeSlug) {
    try {
      const snap = await adminDb.collection('admins')
        .where('specialStore.slug', '==', storeSlug)
        .get();

      if (!snap.empty) {
        const store = snap.docs[0].data().specialStore;
        const bannerUrl = store.banner && store.banner.startsWith('http') ? store.banner : undefined;

        return {
          title: `${store.name} | Nomo Storez`,
          description: store.slogan || `Shop premium fashion from ${store.name} on Nomo Storez.`,
          openGraph: {
            title: `${store.name} | Nomo Storez`,
            description: store.slogan || `Shop premium fashion from ${store.name} on Nomo Storez.`,
            images: bannerUrl ? [{ url: bannerUrl, width: 1200, height: 630 }] : [],
          },
          twitter: {
            card: 'summary_large_image',
            title: `${store.name} | Nomo Storez`,
            description: store.slogan || `Shop premium fashion from ${store.name} on Nomo Storez.`,
            images: bannerUrl ? [bannerUrl] : [],
          },
        };
      }
    } catch (err) {
      console.error('Error generating special store metadata:', err);
    }
  }

  return {
    title: 'Fashion & Wears | Nomo Storez',
    description: 'Explore our collection of trendy clothing, shoes, and stylish accessories on Nomo Storez.',
  };
}

export default function WearsPage() {
  return <WearsClient />;
}
