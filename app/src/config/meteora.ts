import { PublicKey } from '@solana/web3.js';

// Meteora Program IDs for different networks
export const METEORA_PROGRAM_IDS = {
  devnet: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  testnet: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  mainnet: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
} as const;

// Meteora API endpoints
export const METEORA_API_ENDPOINTS = {
  devnet: 'https://api.meteora.ag',
  testnet: 'https://api.meteora.ag',
  mainnet: 'https://api.meteora.ag',
} as const;

// Default Meteora pool configuration for devnet
export const DEFAULT_METEORA_POOL_CONFIG = {
  binStep: 25, // 0.25% price bins
  baseFactor: 1000, // Base fee factor
  filterPeriod: 300, // 5 minutes volatility filter
  decayPeriod: 600, // 10 minutes fee decay
  reductionFactor: 500, // Fee reduction factor
  variableFeeControl: 300, // Variable fee control
  protocolShare: 100, // Protocol fee share (1%)
  maxBinStep: 100, // Maximum bin step
  minBinStep: 1, // Minimum bin step
  maxSwapAmount: 1000000000, // Maximum swap amount in lamports
  minSwapAmount: 1000000, // Minimum swap amount in lamports
};

// Get Meteora configuration for current network
export const getMeteoraConfig = (network: 'devnet' | 'testnet' | 'mainnet' = 'devnet') => {
  return {
    programId: new PublicKey(METEORA_PROGRAM_IDS[network]),
    apiUrl: METEORA_API_ENDPOINTS[network],
    network,
    defaultPoolConfig: DEFAULT_METEORA_POOL_CONFIG,
  };
};

// Get current Meteora configuration (defaults to devnet)
export const getCurrentMeteoraConfig = () => {
  return getMeteoraConfig('devnet');
};
