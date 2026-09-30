import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Houseye — Property Management Platform',
    template: '%s | Houseye',
  },
  description:
    'Houseye is a multi-tenant property management SaaS for owners, managers and tenants. Manage properties, rent, billing, maintenance and more.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
