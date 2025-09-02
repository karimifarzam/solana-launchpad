'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
// import { GraduationProgress } from './GraduationProgress';

interface LaunchpadData {
  id: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  mint: string;
  image: string;
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
  meteoraPool?: string;
  isVerified: boolean;
}

interface LaunchpadCardProps {
  launchpad: LaunchpadData;
}

export function LaunchpadCard({ launchpad }: LaunchpadCardProps) {
  const isPriceUp = launchpad.priceChange24h > 0;
  const timeAgo = formatTimeAgo(launchpad.createdAt);

  return (
    <Link href={`/token/${launchpad.id}`}>
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden card-hover">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <img
                src={launchpad.image}
                alt={launchpad.name}
                className="w-12 h-12 rounded-full bg-gray-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://via.placeholder.com/48x48?text=${launchpad.symbol.substring(0, 2)}`;
                }}
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">{launchpad.name}</h3>
                  {launchpad.isVerified && (
                    <CheckBadgeIcon className="w-4 h-4 text-blue-500" />
                  )}
                </div>
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
                {isPriceUp ? (
                  <TrendingUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDownIcon className="w-4 h-4 mr-1" />
                )}
                {Math.abs(launchpad.priceChange24h).toFixed(1)}%
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {launchpad.description}
          </p>
        </div>

        {/* Stats */}
        <div className="px-6 pb-4">
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
            <div>
              <div className="text-xs text-gray-500 mb-1">SOL Raised</div>
              <div className="font-medium text-gray-900">
                {launchpad.solRaised.toFixed(1)} SOL
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Tokens Traded</div>
              <div className="font-medium text-gray-900">
                {formatNumber(launchpad.tokensTraded)}
              </div>
            </div>
          </div>
        </div>

        {/* Graduation Progress */}
        {launchpad.status === 'active' && (
          <div className="px-6 pb-4">
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

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <ClockIcon className="w-4 h-4 mr-1" />
                {timeAgo}
              </div>
              <div className="flex items-center capitalize">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  launchpad.curveType === 'linear' ? 'bg-blue-400' : 'bg-purple-400'
                }`} />
                {launchpad.curveType}
              </div>
            </div>

            {launchpad.status === 'graduated' && (
              <div className="flex items-center text-green-600">
                <GlobeAltIcon className="w-4 h-4 mr-1" />
                Meteora Pool
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: 'active' | 'graduated' | 'paused' }) {
  const config = {
    active: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Active',
      icon: FireIcon,
    },
    graduated: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Graduated',
      icon: CheckBadgeIcon,
    },
    paused: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Paused',
      icon: ClockIcon,
    },
  };

  const statusConfig = config[status];
  const Icon = statusConfig.icon;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
      <Icon className="w-3 h-3 mr-1" />
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

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'Just now';
  }
}