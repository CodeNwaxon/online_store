'use client';

import { useParams } from 'next/navigation';
import CategoryDetailPage from '@/components/CategoryDetailPage';

export default function WearsDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <CategoryDetailPage
      id={id}
      collectionName="wears"
      themeConfig={{
        accent: 'text-purple-600',
        btn: 'bg-purple-600 hover:bg-purple-700',
        lightBg: 'bg-purple-50',
        lightBorder: 'border-purple-100'
      }}
      backPath="/shop/wears"
      categoryName="Wears"
    />
  );
}
