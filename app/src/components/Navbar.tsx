'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { getCurrentNetworkConfig } from '../config/networks';
import { 
  Bars3Icon, 
  XMarkIcon, 
  RocketLaunchIcon,
  ChartBarIcon,
  InformationCircleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic import for WalletMultiButton to avoid hydration issues
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigation = [
    { name: 'Launch', href: '/create', icon: RocketLaunchIcon },
    { name: 'Explore', href: '/explore', icon: ChartBarIcon },
    { name: 'Portfolio', href: '/portfolio', icon: Cog6ToothIcon },
    { name: 'About', href: '/about', icon: InformationCircleIcon },
  ];

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <RocketLaunchIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Solana Launchpad
              </span>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors duration-200"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Network indicator */}
            <div className="hidden sm:flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-600">
                {getCurrentNetworkConfig().name.toLowerCase()}
              </span>
            </div>

            {/* Wallet button */}
            {mounted && <WalletMultiButton className="!bg-primary-600 !hover:bg-primary-700 !rounded-lg !text-sm !font-medium !h-10" />}

            {/* Mobile menu button */}
            <div className="sm:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-primary-600 hover:bg-gray-100 transition-colors duration-200"
                onClick={() => setIsOpen(!isOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {isOpen ? (
                  <XMarkIcon className="block h-6 w-6" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="sm:hidden bg-white border-t border-gray-200"
          >
            <div className="pt-2 pb-3 space-y-1 px-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-base font-medium text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              ))}
              
              {/* Network indicator for mobile */}
              <div className="flex items-center px-3 py-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                Network: {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// Add a connection status component
export function ConnectionStatus() {
  const { connection } = useConnection();
  const [rpcHealth, setRpcHealth] = useState<'healthy' | 'slow' | 'error'>('healthy');

  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const start = Date.now();
        await connection.getLatestBlockhash();
        const latency = Date.now() - start;
        
        if (latency < 1000) {
          setRpcHealth('healthy');
        } else if (latency < 3000) {
          setRpcHealth('slow');
        } else {
          setRpcHealth('error');
        }
      } catch (error) {
        setRpcHealth('error');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [connection]);

  const statusConfig = {
    healthy: { color: 'bg-green-400', text: 'Connected' },
    slow: { color: 'bg-yellow-400', text: 'Slow' },
    error: { color: 'bg-red-400', text: 'Error' },
  };

  return (
    <div className="flex items-center space-x-2 text-xs text-gray-600">
      <div className={`w-2 h-2 rounded-full ${statusConfig[rpcHealth].color} ${rpcHealth === 'healthy' ? 'animate-pulse' : ''}`}></div>
      <span>{statusConfig[rpcHealth].text}</span>
    </div>
  );
}