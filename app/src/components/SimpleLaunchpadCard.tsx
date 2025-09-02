'use client';

import React from 'react';
import Link from 'next/link';

interface LaunchpadData {
  id: string;
  name: string;
  symbol: string;
  description: string;
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  solRaised: number;
  tokensTraded: number;
  status: 'active' | 'graduated' | 'paused';
  curveType: 'linear' | 'exponential';
  graduationProgress: number;
  createdAt: number;
  isVerified: boolean;
}

interface LaunchpadCardProps {
  launchpad: LaunchpadData;
}

export function SimpleLaunchpadCard({ launchpad }: LaunchpadCardProps) {
  const isPriceUp = launchpad.priceChange24h > 0;

  return (
    <Link href={`/token/${launchpad.id}`}>
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden p-6 cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 font-bold text-sm">
              {launchpad.symbol.substring(0, 2)}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{launchpad.name}</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">${launchpad.symbol}</span>
              <StatusBadge status={launchpad.status} />
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-semibold text-gray-900">
            ${launchpad.currentPrice.toFixed(6)}
          </div>
          <div className={`flex items-center text-sm ${
            isPriceUp ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className="mr-1">{isPriceUp ? '↑' : '↓'}</span>
            {Math.abs(launchpad.priceChange24h).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">
        {launchpad.description}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Market Cap</div>
          <div className="font-medium text-gray-900">
            ${formatNumber(launchpad.marketCap)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">24h Volume</div>
          <div className="font-medium text-gray-900">
            ${formatNumber(launchpad.volume24h)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {launchpad.status === 'active' && (
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2">Graduation Progress</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, launchpad.graduationProgress)}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {launchpad.graduationProgress.toFixed(1)}%
          </div>
        </div>
      )}
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: 'active' | 'graduated' | 'paused' }) {
  const config = {
    active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
    graduated: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Graduated' },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Paused' },
  };

  const statusConfig = config[status];

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
      {statusConfig.label}
    </span>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}