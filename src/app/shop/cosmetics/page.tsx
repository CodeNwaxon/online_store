import { Metadata } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import CosmeticsClient from './CosmeticsClient';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ store?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { store: storeSlug } = await searchParams;

  let defaultImageUrl = 'https://nomostores.com/nomoStore_building.jpeg';
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/general`,
      { next: { revalidate: 3600 } }
    );
    if (response.ok) {
      const data = await response.json();
      const categoriesExplorer = data.fields?.categoriesExplorer?.mapValue?.fields;
      if (categoriesExplorer?.cosmetics?.mapValue?.fields?.image?.stringValue) {
        let url = categoriesExplorer.cosmetics.mapValue.fields.image.stringValue;
        if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/c_')) {
          url = url.replace('/upload/', '/upload/c_fill,w_1200,h_630,q_80/');
        }
        defaultImageUrl = url.startsWith('http') ? url : `https://nomostores.com${url}`;
      }
    }
  } catch (err) {}

  if (storeSlug) {
    try {
      const snap = await adminDb.collection('admins')
        .where('specialStore.slug', '==', storeSlug)
        .get();

      if (!snap.empty) {
        const store = snap.docs[0].data().specialStore;
        
        const storeName = store.name || storeSlug;
        const storeSlogan = store.slogan || `Shop premium cosmetics and beauty products from ${storeName} on Nomo Storez.`;
        let bannerUrl = store.banner || defaultImageUrl;

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
    title: 'Cosmetics & Beauty | Nomo Storez',
    description: 'Discover our range of premium skincare, makeup, and beauty products on Nomo Storez.',
    openGraph: {
      title: 'Cosmetics & Beauty | Nomo Storez',
      description: 'Discover our range of premium skincare, makeup, and beauty products on Nomo Storez.',
      images: [defaultImageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Cosmetics & Beauty | Nomo Storez',
      description: 'Discover our range of premium skincare, makeup, and beauty products on Nomo Storez.',
      images: [defaultImageUrl],
    }
  };
}

export default function CosmeticsPage() {
  return <CosmeticsClient />;
}
