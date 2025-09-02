'use client';

import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClockIcon,
  FireIcon,
  TrendingUpIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { SimpleLaunchpadCard } from '../src/components/SimpleLaunchpadCard';

// Mock data for demonstration
const mockLaunchpads = [
  {
    id: '1',
    name: 'DogeCoin Solana',
    symbol: 'DOGES',
    description: 'The first meme coin on Solana with a bonding curve mechanism',
    creator: 'Creator1...',
    mint: 'mint1...',
    image: 'https://via.placeholder.com/100x100?text=DOGES',
    currentPrice: 0.00156,
    priceChange24h: 15.6,
    marketCap: 125000,
    volume24h: 45000,
    solRaised: 67.5,
    tokensTraded: 890000,
    status: 'active',
    curveType: 'linear',
    graduationProgress: 67.5,
    createdAt: Date.now() - 86400000 * 2,
    isVerified: false,
  },
];

export default function ExplorePage() {
  const { connected } = useWallet();
  const [launchpads, setLaunchpads] = useState(mockLaunchpads);

  // Load launchpads from localStorage on component mount
  useEffect(() => {
    const savedLaunchpads = JSON.parse(localStorage.getItem('launchpads') || '[]');
    if (savedLaunchpads.length > 0) {
      setLaunchpads([...savedLaunchpads, ...mockLaunchpads]);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore Launchpads</h1>
        <p className="text-gray-600">Discover and trade tokens launched on our platform</p>
      </div>

      {/* Basic Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
              <ChartBarIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{launchpads.length}</div>
              <div className="text-sm text-gray-600">Total Launches</div>
            </div>
          </div>
        </div>
      </div>

      {/* Token Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {launchpads.map((launchpad, index) => (
          <motion.div
            key={launchpad.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <SimpleLaunchpadCard launchpad={launchpad} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}