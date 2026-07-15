import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fashion & Wears | Nomo Storez',
  description: 'Explore our collection of trendy clothing, shoes, and stylish accessories on Nomo Storez.',
};

export default function WearsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
