import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from './src/components/WalletProvider';
import { Navbar } from './src/components/Navbar';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Solana Launchpad - Create and Trade Tokens with Bonding Curves',
  description: 'Launch your token on Solana with automated bonding curves and Meteora Pool integration. Fair and decentralized token launches.',
  keywords: 'Solana, launchpad, token, bonding curve, Meteora, DeFi, crypto',
  authors: [{ name: 'Solana Launchpad Team' }],
  openGraph: {
    title: 'Solana Launchpad',
    description: 'Launch your token with automated bonding curves',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solana Launchpad',
    description: 'Launch your token with automated bonding curves',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800`}>
        <WalletProvider>
          <div className="min-h-full">
            <Navbar />
            <main className="pb-8">
              {children}
            </main>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10B981',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}