import { Metadata } from 'next';
import WearsClient from './WearsClient';

type Props = {
  searchParams: Promise<{ store?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { store: storeSlug } = await searchParams;

  if (storeSlug) {
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: "admins" }],
              where: {
                fieldFilter: {
                  field: { fieldPath: "specialStore.slug" },
                  op: "EQUAL",
                  value: { stringValue: storeSlug }
                }
              },
              limit: 1
            }
          }),
          next: { revalidate: 60 } // Cache for 60 seconds
        }
      );

      if (response.ok) {
        const data = await response.json();
        // runQuery returns an array of objects. If empty, it returns [{ readTime: "..." }] without a document
        if (data && data.length > 0 && data[0].document) {
          const specialStore = data[0].document.fields.specialStore?.mapValue?.fields;
          
          if (specialStore) {
            const storeName = specialStore.name?.stringValue || storeSlug;
            const storeSlogan = specialStore.slogan?.stringValue || `Shop premium fashion from ${storeName} on Nomo Storez.`;
            const bannerUrl = specialStore.banner?.stringValue || undefined;

            return {
              title: `${storeName} | Nomo Storez`,
              description: storeSlogan,
              openGraph: {
                title: `${storeName} | Nomo Storez`,
                description: storeSlogan,
                images: bannerUrl ? [{ url: bannerUrl, width: 1200, height: 630 }] : [],
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

  // Ensure default fallback has empty OG so it inherits root layout nicely, 
  // or provide specific OG for Wears.
  return {
    title: 'Fashion & Wears | Nomo Storez',
    description: 'Explore our collection of trendy clothing, shoes, and stylish accessories on Nomo Storez.',
    openGraph: {
      title: 'Fashion & Wears | Nomo Storez',
      description: 'Explore our collection of trendy clothing, shoes, and stylish accessories on Nomo Storez.',
    }
  };
}

export default function WearsPage() {
  return <WearsClient />;
}
