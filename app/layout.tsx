import { Metadata } from 'next';
import "./globals.css";

export const metadata: Metadata = {
  title: 'AI × CYBERSECURITY × ENTREPRENEURSHIP',
  description: 'BUILD. BREAK. SECURE. SCALE.',
  authors: [{ name: 'Atharv Tiwari' }],
  openGraph: {
    title: 'AI × CYBERSECURITY × ENTREPRENEURSHIP',
    description: 'BUILD. BREAK. SECURE. SCALE.',
    type: 'website',
  },
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
