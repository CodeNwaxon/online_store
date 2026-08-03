import CategoryDetailPage from '@/components/CategoryDetailPage';
import { adminDb } from '@/lib/firebaseAdmin';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const docSnap = await adminDb.collection('toilet_kitchen').doc(id).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const title = data?.name || 'Toilet & Kitchen Product';
      const description = data?.description ? (data.description.length > 150 ? data.description.substring(0, 147) + '...' : data.description) : 'Check out this amazing toilet & kitchen product on Nomo Storez!';
      
      // Determine best image
      let imageUrl = '/images/placeholder.png';
      if (data?.images && data.images.length > 0) {
        imageUrl = data.images[0];
      } else if (data?.image) {
        imageUrl = data.image;
      }
      
      if (imageUrl.includes('res.cloudinary.com') && imageUrl.includes('/upload/')) {
        if (!imageUrl.includes('/upload/c_')) {
          imageUrl = imageUrl.replace('/upload/', '/upload/c_fill,w_800,h_800,q_80/');
        }
      }
      
      const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `https://nomo-stores.com${imageUrl}`;
      
      return {
        title: `${title} | Nomo Storez`,
        description,
        openGraph: {
          title: `${title} | Nomo Storez`,
          description,
          images: [absoluteImageUrl],
        },
        twitter: {
          card: 'summary_large_image',
          title: `${title} | Nomo Storez`,
          description,
          images: [absoluteImageUrl],
        }
      };
    }
  } catch (error) {
    console.error("Error generating metadata:", error instanceof Error ? error.message : String(error));
  }
  
  return {
    title: 'Toilet & Kitchen | Nomo Storez',
  }
}

export default async function ToiletKitchenDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <CategoryDetailPage
      id={id}
      collectionName="toilet_kitchen"
      themeConfig={{
        accent: 'text-teal-600',
        btn: 'bg-teal-600 hover:bg-teal-700',
        lightBg: 'bg-teal-50',
        lightBorder: 'border-teal-100'
      }}
      backPath="/shop/toilet-kitchen"
      categoryName="Toilet & Kitchen"
    />
  );
}
