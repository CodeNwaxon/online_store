import CategoryDetailPage from '@/components/CategoryDetailPage';
import { adminDb } from '@/lib/firebaseAdmin';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const docSnap = await adminDb.collection('cosmetics').doc(id).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const title = data?.name || 'Cosmetics Product';
      const description = data?.description ? (data.description.length > 150 ? data.description.substring(0, 147) + '...' : data.description) : 'Check out this amazing cosmetics product on Nomo Storez!';
      
      // Determine best image
      let imageUrl = '/images/placeholder.png';
      if (data?.images && data.images.length > 0) {
        imageUrl = data.images[0];
      } else if (data?.image) {
        imageUrl = data.image;
      }
      
      return {
        title: `${title} | Nomo Storez`,
        description,
        openGraph: {
          title: `${title} | Nomo Storez`,
          description,
          images: [imageUrl],
        },
        twitter: {
          card: 'summary_large_image',
          title: `${title} | Nomo Storez`,
          description,
          images: [imageUrl],
        }
      };
    }
  } catch (error) {
    console.error("Error generating metadata", error);
  }
  
  return {
    title: 'Cosmetics | Nomo Storez',
  }
}

export default async function CosmeticsDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <CategoryDetailPage
      id={id}
      collectionName="cosmetics"
      themeConfig={{
        accent: 'text-pink-600',
        btn: 'bg-pink-600 hover:bg-pink-700',
        lightBg: 'bg-pink-50',
        lightBorder: 'border-pink-100'
      }}
      backPath="/shop/cosmetics"
      categoryName="Cosmetics"
    />
  );
}
