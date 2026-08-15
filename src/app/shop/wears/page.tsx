import { Metadata } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import WearsClient from './WearsClient';

export const dynamic = 'force-dynamic';

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
        
        const storeName = store.name || storeSlug;
        const storeSlogan = store.slogan || `Shop premium fashion from ${storeName} on Nomo Storez.`;
        let bannerUrl = store.banner || '/images/placeholder.png';

        if (bannerUrl.includes('res.cloudinary.com') && bannerUrl.includes('/upload/')) {
          if (!bannerUrl.includes('/upload/c_')) {
            bannerUrl = bannerUrl.replace('/upload/', '/upload/c_fill,w_1200,h_630,q_80/');
          }
        }

        const absoluteImageUrl = bannerUrl.startsWith('http') ? bannerUrl : `https://nomostores.com${bannerUrl}`;

        return {
          title: `${storeName} | Nomo Storez`,
          description: storeSlogan,
          openGraph: {
            title: `${storeName} | Nomo Storez`,
            description: storeSlogan,
            images: [absoluteImageUrl],
          },
          twitter: {
            card: 'summary_large_image',
            title: `${storeName} | Nomo Storez`,
            description: storeSlogan,
            images: [absoluteImageUrl],
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
