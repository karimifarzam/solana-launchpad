import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

export interface NetworkConfig {
  name: string;
  endpoint: string;
  wsEndpoint: string;
  explorer: string;
  faucet?: string;
  isTestnet: boolean;
}

export const NETWORKS: Record<WalletAdapterNetwork, NetworkConfig> = {
  [WalletAdapterNetwork.Mainnet]: {
    name: 'Mainnet',
    endpoint: clusterApiUrl(WalletAdapterNetwork.Mainnet),
    wsEndpoint: clusterApiUrl(WalletAdapterNetwork.Mainnet).replace('https://', 'wss://'),
    explorer: 'https://explorer.solana.com',
    isTestnet: false,
  },
  [WalletAdapterNetwork.Testnet]: {
    name: 'Testnet',
    endpoint: 'https://api.testnet.solana.com',
    wsEndpoint: 'wss://api.testnet.solana.com',
    explorer: 'https://explorer.solana.com/?cluster=testnet',
    faucet: 'https://faucet.solana.com',
    isTestnet: true,
  },
  [WalletAdapterNetwork.Devnet]: {
    name: 'Devnet',
    endpoint: clusterApiUrl(WalletAdapterNetwork.Devnet),
    wsEndpoint: clusterApiUrl(WalletAdapterNetwork.Devnet).replace('https://', 'wss://'),
    explorer: 'https://explorer.solana.com/?cluster=devnet',
    faucet: 'https://faucet.solana.com',
    isTestnet: true,
  },
  [WalletAdapterNetwork.Localnet]: {
    name: 'Localnet',
    endpoint: 'http://127.0.0.1:8899',
    wsEndpoint: 'ws://127.0.0.1:8899',
    explorer: 'https://explorer.solana.com/?cluster=custom&customUrl=http://127.0.0.1:8899',
    isTestnet: false,
  },
};

export const getCurrentNetwork = (): WalletAdapterNetwork => {
  // Always return Devnet for consistency between server and client
  return WalletAdapterNetwork.Devnet;
};

export const getCurrentNetworkConfig = (): NetworkConfig => {
  const network = getCurrentNetwork();
  return NETWORKS[network];
};

