import { Metadata } from 'next';
import WearsClient from './WearsClient';

type Props = {
  searchParams: Promise<{ store?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { store: storeSlug } = await searchParams;

  if (storeSlug) {
    try {
      // Use the proven Firestore REST API (same pattern as root layout.tsx)
      // to list all admins and find the one with matching specialStore slug
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admins?pageSize=100`,
        { next: { revalidate: 60 } }
      );

      if (response.ok) {
        const data = await response.json();
        const documents = data.documents || [];

        // Find the admin doc whose specialStore.slug matches
        for (const doc of documents) {
          const specialStore = doc.fields?.specialStore?.mapValue?.fields;
          if (specialStore && specialStore.slug?.stringValue === storeSlug) {
            const storeName = specialStore.name?.stringValue || storeSlug;
            const storeSlogan = specialStore.slogan?.stringValue || `Shop premium fashion from ${storeName} on Nomo Storez.`;
            const bannerUrl = specialStore.banner?.stringValue || '';

            return {
              title: `${storeName} | Nomo Storez`,
              description: storeSlogan,
              openGraph: {
                title: `${storeName} | Nomo Storez`,
                description: storeSlogan,
                url: `https://nomo-store.vercel.app/shop/wears?store=${storeSlug}`,
                siteName: 'Nomo Storez',
                images: bannerUrl
                  ? [{ url: bannerUrl, width: 1200, height: 630, alt: storeName }]
                  : [],
                locale: 'en_US',
                type: 'website',
              },
              twitter: {
                card: 'summary_large_image',
                title: `${storeName} | Nomo Storez`,
                description: storeSlogan,
                images: bannerUrl ? [bannerUrl] : [],
              },
            };
          }
        }
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
