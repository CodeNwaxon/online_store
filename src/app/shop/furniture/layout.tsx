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
      if (data.fields?.installmentBg?.stringValue) {
        let url = data.fields.installmentBg.stringValue;
        if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/c_')) {
          url = url.replace('/upload/', '/upload/c_fill,w_1200,h_630,q_80/');
        }
        imageUrl = url.startsWith('http') ? url : `https://nomostores.com${url}`;
      }
    }
  } catch (err) {}

  return {
    title: 'Furniture & Decor | Nomo Storez',
    description: 'Discover premium furniture and beautiful artifacts for your space.',
    openGraph: {
      title: 'Furniture & Decor | Nomo Storez',
      description: 'Discover premium furniture and beautiful artifacts for your space.',
      images: [imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Furniture & Decor | Nomo Storez',
      description: 'Discover premium furniture and beautiful artifacts for your space.',
      images: [imageUrl],
    },
  };
}

export default function FurnitureLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
