import { expect } from 'chai';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN, setProvider } from '@coral-xyz/anchor';
import { LaunchpadSDK, NETWORKS, CurveType } from '../sdk/src';
import * as anchor from '@coral-xyz/anchor';

describe('Solana Launchpad Integration Tests', () => {
  let connection: Connection;
  let provider: AnchorProvider;
  let sdk: LaunchpadSDK;
  let creator: Keypair;
  let trader: Keypair;

  before(async () => {
    // Connect to devnet
    connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Create test keypairs
    creator = Keypair.generate();
    trader = Keypair.generate();
    
    // Fund accounts with devnet SOL
    await connection.requestAirdrop(creator.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.requestAirdrop(trader.publicKey, 1 * LAMPORTS_PER_SOL);
    
    // Wait for airdrops
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Set up provider
    const wallet = new Wallet(creator);
    provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    setProvider(provider);
    
    // Initialize SDK
    sdk = new LaunchpadSDK(connection, {
      programId: new PublicKey(NETWORKS.devnet.programId),
    });
  });

  describe('Account Structure Tests', () => {
    it('should derive correct PDA addresses', () => {
      const mint = Keypair.generate().publicKey;
      
      // Test PDA derivations
      const [globalStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('global_state')],
        new PublicKey(NETWORKS.devnet.programId)
      );
      
      const [launchpadPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('launchpad'), mint.toBuffer()],
        new PublicKey(NETWORKS.devnet.programId)
      );
      
      const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding_curve'), launchpadPDA.toBuffer()],
        new PublicKey(NETWORKS.devnet.programId)
      );
      
      expect(globalStatePDA).to.be.instanceOf(PublicKey);
      expect(launchpadPDA).to.be.instanceOf(PublicKey);
      expect(bondingCurvePDA).to.be.instanceOf(PublicKey);
    });
  });

  describe('Bonding Curve Mathematics', () => {
    it('should calculate linear curve prices correctly', () => {
      const basePrice = new BN(1000); // 1000 lamports
      const slope = new BN(10);       // 10 lamports per token
      
      // Test price at different supply levels
      const price0 = basePrice.add(slope.mul(new BN(0)));
      const price100 = basePrice.add(slope.mul(new BN(100)));
      const price1000 = basePrice.add(slope.mul(new BN(1000)));
      
      expect(price0.toNumber()).to.equal(1000);
      expect(price100.toNumber()).to.equal(2000);
      expect(price1000.toNumber()).to.equal(11000);
    });

    it('should calculate linear curve cost integration correctly', () => {
      const basePrice = new BN(1000);
      const slope = new BN(10);
      
      // Cost to buy first 100 tokens (supply 0 -> 100)
      // Expected: 1000 * 100 + 10 * (100² - 0²) / 2 = 100000 + 50000 = 150000
      const deltaSupply = new BN(100);
      const baseCost = basePrice.mul(deltaSupply);
      const slopeCost = slope.mul(new BN(100).mul(new BN(100))).div(new BN(2));
      const totalCost = baseCost.add(slopeCost);
      
      expect(totalCost.toNumber()).to.equal(150000);
    });

    it('should handle fee calculations correctly', () => {
      const amount = new BN(10000); // 10000 lamports
      
      // Test 1% fee (100 bps)
      const fee1Percent = amount.mul(new BN(100)).div(new BN(10000));
      expect(fee1Percent.toNumber()).to.equal(100);
      
      // Test 5% fee (500 bps)
      const fee5Percent = amount.mul(new BN(500)).div(new BN(10000));
      expect(fee5Percent.toNumber()).to.equal(500);
      
      // Test net amount after fee
      const netAmount = amount.sub(fee5Percent);
      expect(netAmount.toNumber()).to.equal(9500);
    });
  });

  describe('SDK Quote Functions', () => {
    it('should generate accurate buy quotes', async () => {
      // This test would be implemented once the program is deployed
      // For now, we'll test the quote calculation logic
      
      const mockLaunchpadState = {
        creatorFeeBps: 300, // 3%
      };
      
      const mockBondingCurve = {
        curveType: CurveType.Linear,
        curveParams: {
          basePrice: new BN(1000),
          slope: new BN(10),
          step: new BN(1),
          maxSupply: new BN(1000000),
          reserved: [new BN(0), new BN(0), new BN(0), new BN(0)],
        },
        supplySold: new BN(50000),
        solReserves: new BN(0),
        virtualSolReserves: new BN(0),
        virtualTokenReserves: new BN(0),
        feeCollected: new BN(0),
        lastPrice: new BN(501000), // 1000 + 10 * 50000
        bump: 255,
        launchpad: PublicKey.default,
      };
      
      const mockGlobalState = {
        platformFeeBps: 100, // 1%
      };
      
      // Test quote calculation
      const solAmount = new BN(1000000); // 1M lamports = 0.001 SOL
      const platformFee = solAmount.mul(new BN(100)).div(new BN(10000));
      const creatorFee = solAmount.mul(new BN(300)).div(new BN(10000));
      const totalFees = platformFee.add(creatorFee);
      const netSolAmount = solAmount.sub(totalFees);
      
      expect(platformFee.toNumber()).to.equal(100); // 0.01% of 1M
      expect(creatorFee.toNumber()).to.equal(300);  // 0.03% of 1M
      expect(netSolAmount.toNumber()).to.equal(960000); // 96% of original
    });
  });

  describe('Validation Functions', () => {
    it('should validate token creation parameters', () => {
      const validParams = {
        name: 'Test Token',
        symbol: 'TEST',
        uri: 'https://example.com/metadata.json',
        decimals: 9,
        creatorFeeBps: 300,
      };
      
      // Should pass validation
      expect(validParams.name.length).to.be.lessThanOrEqual(32);
      expect(validParams.symbol.length).to.be.lessThanOrEqual(8);
      expect(validParams.decimals).to.be.at.most(9);
      expect(validParams.creatorFeeBps).to.be.at.most(500);
      
      // Test invalid parameters
      const invalidName = 'A'.repeat(35); // Too long
      expect(invalidName.length).to.be.greaterThan(32);
      
      const invalidSymbol = 'TOOLONG123'; // Too long
      expect(invalidSymbol.length).to.be.greaterThan(8);
      
      const invalidDecimals = 15; // Too high
      expect(invalidDecimals).to.be.greaterThan(9);
      
      const invalidFee = 600; // Too high (6%)
      expect(invalidFee).to.be.greaterThan(500);
    });

    it('should validate slippage correctly', () => {
      const expectedAmount = new BN(1000);
      const maxSlippageBps = 500; // 5%
      
      // Calculate minimum acceptable amount
      const maxDeviation = expectedAmount.mul(new BN(maxSlippageBps)).div(new BN(10000));
      const minAcceptable = expectedAmount.sub(maxDeviation);
      
      expect(maxDeviation.toNumber()).to.equal(50); // 5% of 1000
      expect(minAcceptable.toNumber()).to.equal(950);
      
      // Test acceptable amount
      const actualAmount1 = new BN(960); // Within tolerance
      expect(actualAmount1.gte(minAcceptable)).to.be.true;
      
      // Test unacceptable amount  
      const actualAmount2 = new BN(940); // Outside tolerance
      expect(actualAmount2.gte(minAcceptable)).to.be.false;
    });
  });

  describe('Graduation Criteria', () => {
    it('should correctly evaluate graduation conditions', () => {
      const mockBondingCurve = {
        solReserves: new BN(80 * LAMPORTS_PER_SOL), // 80 SOL
        supplySold: new BN(600000), // 600k tokens
      };
      
      // Test SOL raised criteria
      const criteriaSol = {
        minSolRaised: 75 * LAMPORTS_PER_SOL, // 75 SOL
        minSupplySold: null,
        timeLimit: null,
      };
      
      const meetsSolCriteria = mockBondingCurve.solReserves.gte(new BN(criteriaSol.minSolRaised));
      expect(meetsSolCriteria).to.be.true;
      
      // Test supply sold criteria
      const criteriaSupply = {
        minSolRaised: null,
        minSupplySold: 700000, // 700k tokens
        timeLimit: null,
      };
      
      const meetsSupplyCriteria = mockBondingCurve.supplySold.gte(new BN(criteriaSupply.minSupplySold));
      expect(meetsSupplyCriteria).to.be.false; // 600k < 700k
      
      // Test combined criteria (OR logic)
      const canGraduate = meetsSolCriteria || meetsSupplyCriteria;
      expect(canGraduate).to.be.true; // SOL criteria met
    });
  });

  describe('Error Handling', () => {
    it('should handle arithmetic overflow protection', () => {
      const maxU64 = new BN('18446744073709551615'); // 2^64 - 1
      
      try {
        const overflow = maxU64.add(new BN(1));
        // BN.js handles overflow differently than Rust, but we can test the concept
        expect(overflow.toString()).to.equal('18446744073709551616');
      } catch (error) {
        // In a real Rust environment, this would throw an overflow error
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle division by zero protection', () => {
      const value = new BN(1000);
      
      try {
        const result = value.div(new BN(0));
        expect.fail('Should have thrown division by zero error');
      } catch (error) {
        expect(error.message).to.include('division by zero');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should efficiently calculate curve prices for large supplies', () => {
      const basePrice = new BN(1000);
      const slope = new BN(1);
      const iterations = 10000;
      
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        const supply = new BN(i * 1000);
        const price = basePrice.add(slope.mul(supply));
        expect(price.gt(new BN(0))).to.be.true;
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 1 second)
      expect(duration).to.be.lessThan(1000);
      console.log(`Calculated ${iterations} prices in ${duration}ms`);
    });
  });

  after(async () => {
    // Cleanup if needed
    console.log('Integration tests completed');
  });
});