'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ClockIcon,
  CheckBadgeIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FireIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface TokenData {
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
  isVerified: boolean;
  totalSupply?: string;
  decimals?: number;
  creatorFeeBps?: number;
}

export default function TokenDetailPage() {
  const params = useParams();
  const { connected } = useWallet();
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [isTrading, setIsTrading] = useState(false);

  useEffect(() => {
    if (params.id) {
      // Load token from localStorage or mock data
      const savedLaunchpads = JSON.parse(localStorage.getItem('launchpads') || '[]');
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

      const allTokens = [...savedLaunchpads, ...mockLaunchpads];
      const foundToken = allTokens.find(t => t.id === params.id);
      
      setToken(foundToken || null);
      setLoading(false);
    }
  }, [params.id]);

  const executeTrade = async () => {
    if (!connected || !token || !buyAmount) {
      return;
    }

    setIsTrading(true);
    try {
      const amount = parseFloat(buyAmount);
      if (amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      // Simulate trading logic based on bonding curve
      const currentPrice = token.currentPrice;
      const tokensToReceive = tradeMode === 'buy' 
        ? (amount / currentPrice) * 0.97 // 3% fees
        : amount * currentPrice * 0.97;

      // Simulate blockchain delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update token data
      const updatedToken = {
        ...token,
        volume24h: token.volume24h + amount,
        tokensTraded: token.tokensTraded + tokensToReceive,
        solRaised: tradeMode === 'buy' 
          ? token.solRaised + amount 
          : Math.max(0, token.solRaised - amount),
        graduationProgress: Math.min(100, token.graduationProgress + (amount / 100) * 2), // Progress based on volume
        currentPrice: tradeMode === 'buy'
          ? token.currentPrice * 1.001 // Small price increase
          : token.currentPrice * 0.999, // Small price decrease
        priceChange24h: tradeMode === 'buy' 
          ? Math.abs(token.priceChange24h) 
          : -Math.abs(token.priceChange24h),
      };

      // Save updated token to localStorage
      const savedLaunchpads = JSON.parse(localStorage.getItem('launchpads') || '[]');
      const updatedLaunchpads = savedLaunchpads.map((t: any) => 
        t.id === token.id ? updatedToken : t
      );
      localStorage.setItem('launchpads', JSON.stringify(updatedLaunchpads));

      // Update state
      setToken(updatedToken);
      setBuyAmount('');

      alert(`${tradeMode === 'buy' ? 'Bought' : 'Sold'} successfully!\n${tradeMode === 'buy' ? 'Received' : 'Spent'}: ${tokensToReceive.toFixed(4)} ${token.symbol}`);

    } catch (error) {
      console.error('Trading error:', error);
      alert('Trading failed. Please try again.');
    } finally {
      setIsTrading(false);
    }
  };

  const calculateQuote = () => {
    if (!token || !buyAmount) return 0;
    const amount = parseFloat(buyAmount);
    if (amount <= 0) return 0;
    
    return tradeMode === 'buy'
      ? (amount / token.currentPrice) * 0.97 // Account for fees
      : amount * token.currentPrice * 0.97;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Token Not Found</h1>
          <Link href="/explore" className="text-primary-600 hover:text-primary-700">
            ← Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  const isPriceUp = token.priceChange24h > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/explore"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Explore
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Token Header */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-start space-x-4">
              <img
                src={token.image}
                alt={token.name}
                className="w-16 h-16 rounded-full bg-gray-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://via.placeholder.com/64x64?text=${token.symbol.substring(0, 2)}`;
                }}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{token.name}</h1>
                  {token.isVerified && (
                    <CheckBadgeIcon className="w-6 h-6 text-blue-500" />
                  )}
                </div>
                <div className="flex items-center space-x-4 mb-3">
                  <span className="text-lg text-gray-600">${token.symbol}</span>
                  <StatusBadge status={token.status} />
                </div>
                <p className="text-gray-600">{token.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  ${token.currentPrice.toFixed(6)}
                </div>
                <div className={`flex items-center justify-end text-lg ${
                  isPriceUp ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="mr-1">{isPriceUp ? '↑' : '↓'}</span>
                  {Math.abs(token.priceChange24h).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Chart Placeholder */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Price Chart</h2>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Chart coming soon</p>
                <p className="text-sm text-gray-400">Real-time price data will be displayed here</p>
              </div>
            </div>
          </div>

          {/* Token Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Token Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract:</span>
                  <span className="font-medium text-gray-900 font-mono text-sm">{token.mint}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Creator:</span>
                  <span className="font-medium text-gray-900 font-mono text-sm">
                    {token.creator.slice(0, 8)}...{token.creator.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Curve Type:</span>
                  <span className="font-medium text-gray-900 capitalize">{token.curveType}</span>
                </div>
                {token.decimals && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Decimals:</span>
                    <span className="font-medium text-gray-900">{token.decimals}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Market Cap:</span>
                  <span className="font-medium text-gray-900">${formatNumber(token.marketCap)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">24h Volume:</span>
                  <span className="font-medium text-gray-900">${formatNumber(token.volume24h)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SOL Raised:</span>
                  <span className="font-medium text-gray-900">{token.solRaised.toFixed(1)} SOL</span>
                </div>
                {token.totalSupply && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Supply:</span>
                    <span className="font-medium text-gray-900">{formatNumber(parseInt(token.totalSupply))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trading Panel */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Tokens Traded</div>
                <div className="text-xl font-bold text-gray-900">{formatNumber(token.tokensTraded)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Created</div>
                <div className="text-sm text-gray-900">{formatTimeAgo(token.createdAt)}</div>
              </div>
            </div>
          </div>

          {/* Graduation Progress */}
          {token.status === 'active' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Graduation Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{token.graduationProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, token.graduationProgress)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {token.graduationProgress >= 100 
                    ? "Ready for graduation to Meteora Pool!"
                    : "Continue trading to reach graduation criteria"
                  }
                </div>
              </div>
            </div>
          )}

          {/* Trading Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Trade {token.symbol}</h3>
            {connected ? (
              <div className="space-y-4">
                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setTradeMode('buy')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      tradeMode === 'buy' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Buy
                  </button>
                  <button 
                    onClick={() => setTradeMode('sell')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      tradeMode === 'sell' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Sell
                  </button>
                </div>
                
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tradeMode === 'buy' ? 'SOL to Spend' : `${token.symbol} to Sell`}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                  />
                </div>

                {/* Quote Display */}
                {buyAmount && parseFloat(buyAmount) > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">You will {tradeMode === 'buy' ? 'receive' : 'get'}:</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {calculateQuote().toFixed(4)} {tradeMode === 'buy' ? token.symbol : 'SOL'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Price: ${token.currentPrice.toFixed(6)} • Fee: 3%
                    </div>
                  </div>
                )}
                
                {/* Execute Trade Button */}
                <button 
                  onClick={executeTrade}
                  disabled={isTrading || !buyAmount || parseFloat(buyAmount) <= 0}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    tradeMode === 'buy'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isTrading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    `${tradeMode === 'buy' ? 'Buy' : 'Sell'} ${token.symbol}`
                  )}
                </button>
                
                <div className="text-xs text-gray-500 text-center">
                  Demo trading • Real SOL transactions coming soon
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">Connect your wallet to trade</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
      <FireIcon className="w-4 h-4 mr-1" />
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