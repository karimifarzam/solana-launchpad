import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { CurveType, CurveParams } from './types';

// ============================================================================
// PDA Derivation Functions
// ============================================================================

export function findGlobalStatePDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    programId
  );
}

export function findLaunchpadPDA(
  mint: PublicKey, 
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('launchpad'), mint.toBuffer()],
    programId
  );
}

export function findBondingCurvePDA(
  launchpad: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bonding_curve'), launchpad.toBuffer()],
    programId
  );
}

export function findCreatorProfilePDA(
  creator: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('creator_profile'), creator.toBuffer()],
    programId
  );
}

export function findSolVaultPDA(
  launchpad: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sol_vault'), launchpad.toBuffer()],
    programId
  );
}

export function findTokenVaultPDA(
  launchpad: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_vault'), launchpad.toBuffer()],
    programId
  );
}

// ============================================================================
// Bonding Curve Mathematics (Client-side)
// ============================================================================

export function calculateLinearPrice(
  supply: BN, 
  basePrice: BN, 
  slope: BN
): BN {
  // P(S) = basePrice + slope * S
  return basePrice.add(slope.mul(supply));
}

export function calculateLinearCost(
  supplyStart: BN,
  supplyEnd: BN,
  basePrice: BN,
  slope: BN
): BN {
  // Integral: Cost = basePrice * ΔS + slope * (S_end² - S_start²) / 2
  if (supplyEnd.lte(supplyStart)) {
    return new BN(0);
  }
  
  const deltaSupply = supplyEnd.sub(supplyStart);
  
  // Base cost: basePrice * ΔS
  const baseCost = basePrice.mul(deltaSupply);
  
  // Slope cost: slope * (S_end² - S_start²) / 2
  const endSquared = supplyEnd.mul(supplyEnd);
  const startSquared = supplyStart.mul(supplyStart);
  const deltaSquared = endSquared.sub(startSquared);
  const slopeCost = slope.mul(deltaSquared).div(new BN(2));
  
  return baseCost.add(slopeCost);
}

export function calculateExponentialPrice(
  supply: BN,
  basePrice: BN,
  multiplier: BN,
  step: BN
): BN {
  // P(S) = basePrice * multiplier^(S/step)
  if (step.eq(new BN(0))) {
    throw new Error('Step cannot be zero');
  }
  
  const exponent = supply.div(step);
  // Simplified exponential calculation for demonstration
  // In production, you'd want a more accurate implementation
  const multiplierPow = multiplier.pow(exponent);
  return basePrice.mul(multiplierPow);
}

export function estimateTokensForSol(
  solAmount: BN,
  currentSupply: BN,
  curveType: CurveType,
  curveParams: CurveParams
): BN {
  switch (curveType) {
    case CurveType.Linear:
      return estimateLinearTokensForSol(
        solAmount,
        currentSupply,
        curveParams.basePrice,
        curveParams.slope
      );
    case CurveType.Exponential:
      return estimateExponentialTokensForSol(
        solAmount,
        currentSupply,
        curveParams.basePrice,
        curveParams.slope,
        curveParams.step
      );
    default:
      throw new Error('Unsupported curve type');
  }
}

function estimateLinearTokensForSol(
  solAmount: BN,
  currentSupply: BN,
  basePrice: BN,
  slope: BN
): BN {
  // Quadratic formula to solve for tokens
  // solAmount = basePrice * tokens + slope * (currentSupply * tokens + tokens²/2)
  
  if (slope.eq(new BN(0))) {
    return solAmount.div(basePrice);
  }
  
  const currentPrice = calculateLinearPrice(currentSupply, basePrice, slope);
  const a = slope.div(new BN(2));
  const b = currentPrice;
  const c = solAmount;
  
  // Quadratic formula: tokens = (-b + sqrt(b² + 4ac)) / (2a)
  const discriminant = b.mul(b).add(new BN(4).mul(a).mul(c));
  const sqrtDiscriminant = new BN(Math.floor(Math.sqrt(discriminant.toNumber())));
  
  return sqrtDiscriminant.sub(b).div(new BN(2).mul(a));
}

function estimateExponentialTokensForSol(
  solAmount: BN,
  currentSupply: BN,
  basePrice: BN,
  multiplier: BN,
  step: BN
): BN {
  // Iterative approximation for exponential curves
  let tokens = new BN(0);
  let accumulatedCost = new BN(0);
  const stepSize = new BN(1000); // Tokens per iteration
  
  while (accumulatedCost.lt(solAmount) && tokens.lt(step.mul(new BN(100)))) {
    const nextTokens = tokens.add(stepSize);
    const stepCost = calculateExponentialCost(
      currentSupply.add(tokens),
      currentSupply.add(nextTokens),
      basePrice,
      multiplier,
      step
    );
    
    if (accumulatedCost.add(stepCost).lte(solAmount)) {
      tokens = nextTokens;
      accumulatedCost = accumulatedCost.add(stepCost);
    } else {
      break;
    }
  }
  
  return tokens;
}

function calculateExponentialCost(
  supplyStart: BN,
  supplyEnd: BN,
  basePrice: BN,
  multiplier: BN,
  step: BN
): BN {
  // Trapezoidal approximation
  const priceStart = calculateExponentialPrice(supplyStart, basePrice, multiplier, step);
  const priceEnd = calculateExponentialPrice(supplyEnd, basePrice, multiplier, step);
  const avgPrice = priceStart.add(priceEnd).div(new BN(2));
  const deltaSupply = supplyEnd.sub(supplyStart);
  
  return avgPrice.mul(deltaSupply);
}

// ============================================================================
// Fee Calculation Utilities
// ============================================================================

export function calculateFee(amount: BN, feeBps: number): BN {
  if (feeBps === 0) return new BN(0);
  if (feeBps > 10000) throw new Error('Invalid fee basis points');
  
  return amount.mul(new BN(feeBps)).div(new BN(10000));
}

export function calculateNetAmount(amount: BN, feeBps: number): BN {
  const fee = calculateFee(amount, feeBps);
  return amount.sub(fee);
}

// ============================================================================
// Price Impact Calculations
// ============================================================================

export function calculatePriceImpact(
  preBuyPrice: BN,
  postBuyPrice: BN
): number {
  if (preBuyPrice.eq(new BN(0))) return 0;
  
  const priceDiff = postBuyPrice.sub(preBuyPrice);
  const impactBps = priceDiff.mul(new BN(10000)).div(preBuyPrice);
  
  return impactBps.toNumber() / 100; // Convert to percentage
}

export function isHighPriceImpact(impactPercentage: number): boolean {
  return impactPercentage > 5; // 5% threshold
}

// ============================================================================
// Validation Utilities
// ============================================================================

export function validateSlippage(
  expectedAmount: BN,
  actualAmount: BN,
  maxSlippageBps: number
): boolean {
  if (maxSlippageBps === 0) {
    return expectedAmount.eq(actualAmount);
  }
  
  const maxDeviation = calculateFee(expectedAmount, maxSlippageBps);
  const minAcceptable = expectedAmount.sub(maxDeviation);
  
  return actualAmount.gte(minAcceptable);
}

export function validateCreateParams(params: {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  creatorFeeBps: number;
}): string[] {
  const errors: string[] = [];
  
  if (params.name.length > 32) {
    errors.push('Token name too long - max 32 characters');
  }
  
  if (params.symbol.length > 8) {
    errors.push('Token symbol too long - max 8 characters');
  }
  
  if (params.uri.length > 200) {
    errors.push('Metadata URI too long - max 200 characters');
  }
  
  if (params.decimals > 9) {
    errors.push('Invalid decimals - must be between 0-9');
  }
  
  if (params.creatorFeeBps > 500) {
    errors.push('Invalid creator fee - must be between 0-500 basis points');
  }
  
  return errors;
}

// ============================================================================
// Format Utilities
// ============================================================================

export function formatTokenAmount(
  amount: BN, 
  decimals: number, 
  precision = 2
): string {
  const divisor = new BN(10).pow(new BN(decimals));
  const wholePart = amount.div(divisor);
  const fractionalPart = amount.mod(divisor);
  
  if (fractionalPart.eq(new BN(0))) {
    return wholePart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.substring(0, precision);
  
  return `${wholePart.toString()}.${trimmedFractional}`;
}

export function formatSolAmount(lamports: BN, precision = 4): string {
  return formatTokenAmount(lamports, 9, precision);
}

export function formatPrice(price: BN, decimals: number): string {
  return formatTokenAmount(price, decimals, 6);
}

export function formatPercentage(value: number, precision = 2): string {
  return `${value.toFixed(precision)}%`;
}

// ============================================================================
// Graduation Criteria Helpers
// ============================================================================

export function checkGraduationProgress(
  solCollected: BN,
  tokensSold: BN,
  currentTime: number,
  criteria: {
    minSolRaised: BN | null;
    minSupplySold: BN | null;
    timeLimit: BN | null;
  }
): {
  canGraduate: boolean;
  progress: {
    solProgress: number;
    supplyProgress: number;
    timeProgress: number;
  };
} {
  let canGraduate = true;
  const progress = {
    solProgress: 100,
    supplyProgress: 100,
    timeProgress: 100,
  };
  
  // Check SOL raised
  if (criteria.minSolRaised) {
    progress.solProgress = solCollected.mul(new BN(100)).div(criteria.minSolRaised).toNumber();
    if (solCollected.lt(criteria.minSolRaised)) {
      canGraduate = false;
    }
  }
  
  // Check supply sold
  if (criteria.minSupplySold) {
    progress.supplyProgress = tokensSold.mul(new BN(100)).div(criteria.minSupplySold).toNumber();
    if (tokensSold.lt(criteria.minSupplySold)) {
      canGraduate = false;
    }
  }
  
  // Check time limit
  if (criteria.timeLimit) {
    const timeLimit = criteria.timeLimit.toNumber();
    if (currentTime < timeLimit) {
      canGraduate = false;
      const totalTime = timeLimit;
      const elapsed = currentTime;
      progress.timeProgress = Math.min(100, (elapsed / totalTime) * 100);
    }
  }
  
  return { canGraduate, progress };
}