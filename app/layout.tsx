import type { Metadata } from 'next';
import { Kanit, Sarabun } from 'next/font/google';
import './globals.css'; // Global styles

const kanit   = Kanit  ({ subsets: ['latin', 'thai'], weight: ['400', '700'], variable: '--font-kanit' });
const sarabun = Sarabun({ subsets: ['latin', 'thai'], weight: ['400', '600', '700'], variable: '--font-sarabun' });

export const metadata: Metadata = {
  title: 'Mudmee Symmetry & 3D Studio',
  description: 'Mudmee Symmetry & 3D Studio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${kanit.variable} ${sarabun.variable}`} suppressHydrationWarning>{children}</body>
    </html>
  );
}
