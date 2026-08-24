import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  let imageUrl = 'https://nomostores.com/nomoStore_building.jpeg'; // fallback
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/general`,
      { next: { revalidate: 3600 } }
    );
    if (response.ok) {
      const data = await response.json();
      const categoriesExplorer = data.fields?.categoriesExplorer?.mapValue?.fields;
      if (categoriesExplorer?.foods?.mapValue?.fields?.image?.stringValue) {
        let url = categoriesExplorer.foods.mapValue.fields.image.stringValue;
        if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/c_')) {
          url = url.replace('/upload/', '/upload/c_fill,w_1200,h_630,q_80/');
        }
        imageUrl = url.startsWith('http') ? url : `https://nomostores.com${url}`;
      }
    }
  } catch (err) {}

  return {
    title: 'Food Market | Nomo Storez',
    description: 'Discover our curated selection of premium grains, rice, beans, and fresh produce.',
    openGraph: {
      title: 'Food Market | Nomo Storez',
      description: 'Discover our curated selection of premium grains, rice, beans, and fresh produce.',
      images: [imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Food Market | Nomo Storez',
      description: 'Discover our curated selection of premium grains, rice, beans, and fresh produce.',
      images: [imageUrl],
    },
  };
}

export default function FoodsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
