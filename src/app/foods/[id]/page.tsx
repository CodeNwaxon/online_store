import FoodDetailClient from '@/components/FoodDetailClient';
import { adminDb } from '@/lib/firebaseAdmin';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const docSnap = await adminDb.collection('foods').doc(id).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const title = data?.name || 'Food Market Product';
      const description = data?.description ? (data.description.length > 150 ? data.description.substring(0, 147) + '...' : data.description) : 'Order fresh, delicious food directly from Nomo Storez!';
      
      // Determine best image
      let imageUrl = '/images/placeholder.png';
      if (data?.images && data.images.length > 0) {
        imageUrl = data.images[0];
      } else if (data?.image) {
        imageUrl = data.image;
      }
      
      return {
        title: `${title} | Food Market | Nomo Storez`,
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
    title: 'Food Market | Nomo Storez',
  }
}

export default async function FoodsDetailPage() {
  return <FoodDetailClient />;
}
