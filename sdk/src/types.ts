import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// ============================================================================
// Account Types
// ============================================================================

export interface GlobalState {
  authority: PublicKey;
  platformFeeBps: number;
  feeVault: PublicKey;
  paused: boolean;
  upgradeAuthority: PublicKey;
  bump: number;
}

export interface LaunchpadState {
  mint: PublicKey;
  creator: PublicKey;
  solVault: PublicKey;
  tokenVault: PublicKey;
  bondingCurve: PublicKey;
  status: LaunchpadStatus;
  creatorFeeBps: number;
  totalSupply: BN;
  graduationCriteria: GraduationCriteria;
  meteoraPool: PublicKey | null;
  createdAt: BN;
  graduatedAt: BN | null;
  bump: number;
}

export interface BondingCurveState {
  launchpad: PublicKey;
  curveType: CurveType;
  curveParams: CurveParams;
  supplySold: BN;
  solReserves: BN;
  virtualSolReserves: BN;
  virtualTokenReserves: BN;
  feeCollected: BN;
  lastPrice: BN;
  bump: number;
}

export interface CreatorProfile {
  creator: PublicKey;
  launchesCount: number;
  successfulLaunches: number;
  totalVolume: BN;
  verified: boolean;
  reputationScore: number;
  createdAt: BN;
  bump: number;
}

// ============================================================================
// Enums
// ============================================================================

export enum LaunchpadStatus {
  Active = 'Active',
  Graduated = 'Graduated',
  Paused = 'Paused',
}

export enum CurveType {
  Linear = 'Linear',
  Exponential = 'Exponential',
  Custom = 'Custom',
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface CurveParams {
  basePrice: BN;
  slope: BN;
  step: BN;
  maxSupply: BN;
  reserved: BN[];
}

export interface GraduationCriteria {
  minSolRaised: BN | null;
  minSupplySold: BN | null;
  timeLimit: BN | null;
  customLogic: PublicKey | null;
}

export interface CreateLaunchpadParams {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  totalSupply: BN;
  curveType: CurveType;
  curveParams: CurveParams;
  creatorFeeBps: number;
  graduationCriteria: GraduationCriteria;
}

export interface MeteoraPoolConfig {
  binStep: number;
  baseFactor: number;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  variableFeeControl: number;
  maxVolatilityAccumulator: number;
  minBinId: number;
  maxBinId: number;
}

// ============================================================================
// Transaction Parameter Types
// ============================================================================

export interface BuyParams {
  launchpad: PublicKey;
  amountSol: BN;
  minTokensOut: BN;
  maxSlippageBps: number;
}

export interface SellParams {
  launchpad: PublicKey;
  amountTokens: BN;
  minSolOut: BN;
  maxSlippageBps: number;
}

export interface QuoteResult {
  inputAmount: BN;
  outputAmount: BN;
  priceImpact: number;
  fee: BN;
  netAmount: BN;
  newPrice: BN;
  newSupply: BN;
}

export interface PriceImpact {
  percentage: number;
  absoluteChange: BN;
  recommended: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface LaunchpadCreatedEvent {
  launchpad: PublicKey;
  mint: PublicKey;
  creator: PublicKey;
  curveType: CurveType;
  basePrice: BN;
  creatorFee: number;
  timestamp: BN;
}

export interface TradeEvent {
  launchpad: PublicKey;
  trader: PublicKey;
  isBuy: boolean;
  solAmount: BN;
  tokenAmount: BN;
  price: BN;
  timestamp: BN;
}

export interface LaunchpadGraduatedEvent {
  launchpad: PublicKey;
  mint: PublicKey;
  creator: PublicKey;
  solCollected: BN;
  tokensSold: BN;
  graduationTime: BN;
  meteoraPool: PublicKey | null;
}

// ============================================================================
// SDK Configuration
// ============================================================================

export interface LaunchpadSDKConfig {
  programId: PublicKey;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  skipPreflight?: boolean;
  maxRetries?: number;
}

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  programId: string;
  meteoraProgramId: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  devnet: {
    name: 'Devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    programId: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
    meteoraProgramId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  },
  testnet: {
    name: 'Testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    programId: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
    meteoraProgramId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  },
  mainnet: {
    name: 'Mainnet-Beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    programId: 'TBD', // To be deployed
    meteoraProgramId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  },
};

// ============================================================================
// Error Types
// ============================================================================

export class LaunchpadSDKError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'LaunchpadSDKError';
  }
}

export enum ErrorCode {
  INVALID_ACCOUNT = 'INVALID_ACCOUNT',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  SLIPPAGE_EXCEEDED = 'SLIPPAGE_EXCEEDED',
  GRADUATION_CRITERIA_NOT_MET = 'GRADUATION_CRITERIA_NOT_MET',
  LAUNCHPAD_NOT_ACTIVE = 'LAUNCHPAD_NOT_ACTIVE',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}