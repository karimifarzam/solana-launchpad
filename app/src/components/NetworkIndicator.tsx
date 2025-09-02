'use client';

import React from 'react';
import { getCurrentNetworkConfig } from '../config/networks';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const NetworkIndicator: React.FC = () => {
  const networkConfig = getCurrentNetworkConfig();

  return (
    <div className="flex items-center space-x-4">
      {/* Network Badge */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          networkConfig.isTestnet ? 'bg-yellow-400' : 'bg-green-400'
        }`} />
        <span className="text-sm font-medium text-gray-700">
          {networkConfig.name}
        </span>
      </div>

      {/* Faucet Link for Testnet */}
      {networkConfig.faucet && (
        <a
          href={networkConfig.faucet}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Get Test SOL
        </a>
      )}

      {/* Wallet Connect Button */}
      <WalletMultiButton />
    </div>
  );
};
