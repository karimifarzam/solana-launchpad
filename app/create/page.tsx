'use client';

import React, { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { LaunchpadSDK, CurveType, NETWORKS } from '../../sdk/src';

interface TokenForm {
  name: string;
  symbol: string;
  description: string;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
  decimals: number;
  totalSupply: string;
}

interface CurveForm {
  curveType: CurveType;
  basePrice: string;
  slope: string;
  step: string;
  maxSupply: string;
}

interface FeeForm {
  creatorFeeBps: number;
}

interface GraduationForm {
  minSolRaised: string;
  minSupplySold: string;
  timeLimit: string;
  hasTimeLimit: boolean;
}

const STEPS = [
  { id: 'token', title: 'Token Details', description: 'Basic token information' },
  { id: 'curve', title: 'Bonding Curve', description: 'Price discovery mechanism' },
  { id: 'fees', title: 'Fees', description: 'Creator compensation' },
  { id: 'graduation', title: 'Graduation', description: 'Meteora migration criteria' },
  { id: 'review', title: 'Review', description: 'Confirm and deploy' },
];

export default function CreateLaunchpadPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [currentStep, setCurrentStep] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Form state
  const [tokenForm, setTokenForm] = useState<TokenForm>({
    name: '',
    symbol: '',
    description: '',
    image: '',
    website: '',
    twitter: '',
    telegram: '',
    decimals: 9,
    totalSupply: '1000000',
  });

  const [curveForm, setCurveForm] = useState<CurveForm>({
    curveType: CurveType.Linear,
    basePrice: '0.001',
    slope: '0.0001',
    step: '1000',
    maxSupply: '800000',
  });

  const [feeForm, setFeeForm] = useState<FeeForm>({
    creatorFeeBps: 300, // 3%
  });

  const [graduationForm, setGraduationForm] = useState<GraduationForm>({
    minSolRaised: '100',
    minSupplySold: '500000',
    timeLimit: '',
    hasTimeLimit: false,
  });

  // SDK instance
  const sdk = React.useMemo(() => {
    if (!connection) return null;
    return new LaunchpadSDK(connection, {
      programId: new PublicKey(NETWORKS.devnet.programId),
    });
  }, [connection]);

  // Validation functions
  const validateTokenForm = () => {
    const errors: string[] = [];
    if (!tokenForm.name.trim()) errors.push('Token name is required');
    if (!tokenForm.symbol.trim()) errors.push('Token symbol is required');
    if (tokenForm.name.length > 32) errors.push('Token name must be 32 characters or less');
    if (tokenForm.symbol.length > 8) errors.push('Token symbol must be 8 characters or less');
    if (tokenForm.decimals < 0 || tokenForm.decimals > 9) errors.push('Decimals must be between 0 and 9');
    return errors;
  };

  const validateCurveForm = () => {
    const errors: string[] = [];
    if (!curveForm.basePrice || parseFloat(curveForm.basePrice) <= 0) {
      errors.push('Base price must be greater than 0');
    }
    if (curveForm.curveType === CurveType.Linear && (!curveForm.slope || parseFloat(curveForm.slope) <= 0)) {
      errors.push('Slope must be greater than 0 for linear curves');
    }
    if (!curveForm.maxSupply || parseInt(curveForm.maxSupply) <= 0) {
      errors.push('Max supply must be greater than 0');
    }
    if (parseInt(curveForm.maxSupply) >= parseInt(tokenForm.totalSupply)) {
      errors.push('Max supply must be less than total supply');
    }
    return errors;
  };

  const validateFeeForm = () => {
    const errors: string[] = [];
    if (feeForm.creatorFeeBps < 0 || feeForm.creatorFeeBps > 500) {
      errors.push('Creator fee must be between 0% and 5%');
    }
    return errors;
  };

  const validateGraduationForm = () => {
    const errors: string[] = [];
    if (graduationForm.minSolRaised && parseFloat(graduationForm.minSolRaised) <= 0) {
      errors.push('Minimum SOL raised must be greater than 0');
    }
    if (graduationForm.minSupplySold && parseInt(graduationForm.minSupplySold) <= 0) {
      errors.push('Minimum supply sold must be greater than 0');
    }
    return errors;
  };

  // Step navigation
  const nextStep = () => {
    let errors: string[] = [];
    
    switch (currentStep) {
      case 0: errors = validateTokenForm(); break;
      case 1: errors = validateCurveForm(); break;
      case 2: errors = validateFeeForm(); break;
      case 3: errors = validateGraduationForm(); break;
    }
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Deploy function
  const deployLaunchpad = async () => {
    if (!connected || !publicKey || !sdk || !signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsDeploying(true);
    try {
      const params = {
        name: tokenForm.name,
        symbol: tokenForm.symbol,
        uri: `data:application/json;base64,${btoa(JSON.stringify({
          name: tokenForm.name,
          symbol: tokenForm.symbol,
          description: tokenForm.description,
          image: tokenForm.image || `https://via.placeholder.com/300x300?text=${tokenForm.symbol}`,
          external_url: tokenForm.website,
          attributes: [
            { trait_type: 'Curve Type', value: curveForm.curveType },
            { trait_type: 'Creator Fee', value: `${feeForm.creatorFeeBps / 100}%` },
          ],
        }))}`,
        decimals: tokenForm.decimals,
        totalSupply: new BN(tokenForm.totalSupply),
        curveType: curveForm.curveType,
        curveParams: {
          basePrice: new BN(Math.floor(parseFloat(curveForm.basePrice) * 1e9)), // Convert to lamports
          slope: new BN(Math.floor(parseFloat(curveForm.slope) * 1e9)),
          step: new BN(curveForm.step),
          maxSupply: new BN(curveForm.maxSupply),
          reserved: [new BN(0), new BN(0), new BN(0), new BN(0)],
        },
        creatorFeeBps: feeForm.creatorFeeBps,
        graduationCriteria: {
          minSolRaised: graduationForm.minSolRaised ? new BN(Math.floor(parseFloat(graduationForm.minSolRaised) * 1e9)) : null,
          minSupplySold: graduationForm.minSupplySold ? new BN(graduationForm.minSupplySold) : null,
          timeLimit: graduationForm.hasTimeLimit && graduationForm.timeLimit ? 
            new BN(new Date(graduationForm.timeLimit).getTime() / 1000) : null,
          customLogic: null,
        },
      };

      toast.success('Creating launchpad...');
      
      // Generate a mock mint address for demo
      const mockMint = `${tokenForm.symbol}${Date.now().toString().slice(-6)}...${Math.random().toString(36).slice(2, 8)}`;
      
      // Create launchpad data
      const launchpadData = {
        id: Date.now().toString(),
        name: tokenForm.name,
        symbol: tokenForm.symbol,
        description: tokenForm.description,
        creator: publicKey.toString(),
        mint: mockMint,
        image: `https://via.placeholder.com/100x100?text=${tokenForm.symbol}`,
        currentPrice: parseFloat(curveForm.basePrice),
        priceChange24h: 0,
        marketCap: 0,
        volume24h: 0,
        solRaised: 0,
        tokensTraded: 0,
        status: 'active' as const,
        curveType: curveForm.curveType,
        graduationProgress: 0,
        createdAt: Date.now(),
        isVerified: false,
        totalSupply: tokenForm.totalSupply,
        decimals: tokenForm.decimals,
        creatorFeeBps: feeForm.creatorFeeBps,
        graduationCriteria: {
          minSolRaised: graduationForm.minSolRaised,
          minSupplySold: graduationForm.minSupplySold,
          timeLimit: graduationForm.timeLimit,
        },
      };
      
      // Save to localStorage (in real implementation, this would be saved to database)
      const existingLaunchpads = JSON.parse(localStorage.getItem('launchpads') || '[]');
      existingLaunchpads.unshift(launchpadData);
      localStorage.setItem('launchpads', JSON.stringify(existingLaunchpads));
      
      // Simulate blockchain transaction delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success(`Launchpad created successfully! Mint: ${mockMint}`);
      
      // Reset form
      setTokenForm({
        name: '',
        symbol: '',
        description: '',
        image: '',
        website: '',
        twitter: '',
        telegram: '',
        decimals: 9,
        totalSupply: '1000000',
      });
      setCurveForm({
        curveType: CurveType.Linear,
        basePrice: '0.001',
        slope: '0.0001',
        step: '1000',
        maxSupply: '800000',
      });
      setCurrentStep(0);
      
    } catch (error) {
      console.error('Error deploying launchpad:', error);
      toast.error('Failed to deploy launchpad. Please try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Wallet Not Connected</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to create a launchpad.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                index < currentStep ? 'bg-primary-600 border-primary-600 text-white' :
                index === currentStep ? 'border-primary-600 text-primary-600' :
                'border-gray-300 text-gray-400'
              }`}>
                {index < currentStep ? (
                  <CheckIcon className="w-6 h-6" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-1 ml-4 ${
                  index < currentStep ? 'bg-primary-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <h2 className="text-2xl font-bold text-gray-800">{STEPS[currentStep].title}</h2>
          <p className="text-gray-600">{STEPS[currentStep].description}</p>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <TokenDetailsStep
              tokenForm={tokenForm}
              setTokenForm={setTokenForm}
            />
          )}
          
          {currentStep === 1 && (
            <BondingCurveStep
              curveForm={curveForm}
              setCurveForm={setCurveForm}
            />
          )}
          
          {currentStep === 2 && (
            <FeesStep
              feeForm={feeForm}
              setFeeForm={setFeeForm}
            />
          )}
          
          {currentStep === 3 && (
            <GraduationStep
              graduationForm={graduationForm}
              setGraduationForm={setGraduationForm}
            />
          )}
          
          {currentStep === 4 && (
            <ReviewStep
              tokenForm={tokenForm}
              curveForm={curveForm}
              feeForm={feeForm}
              graduationForm={graduationForm}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Previous
        </button>

        {currentStep === STEPS.length - 1 ? (
          <button
            onClick={deployLaunchpad}
            disabled={isDeploying}
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isDeploying ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deploying...
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5 mr-2" />
                Deploy Launchpad
              </>
            )}
          </button>
        ) : (
          <button
            onClick={nextStep}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors duration-200"
          >
            Next
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </button>
        )}
      </div>
    </div>
  );
}

// Step Components
function TokenDetailsStep({ tokenForm, setTokenForm }: {
  tokenForm: TokenForm;
  setTokenForm: (form: TokenForm) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Name *
          </label>
          <input
            type="text"
            value={tokenForm.name}
            onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            placeholder="e.g. My Awesome Token"
            maxLength={32}
          />
          <p className="mt-1 text-xs text-gray-500">{tokenForm.name.length}/32 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Symbol *
          </label>
          <input
            type="text"
            value={tokenForm.symbol}
            onChange={(e) => setTokenForm({ ...tokenForm, symbol: e.target.value.toUpperCase() })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            placeholder="e.g. MAT"
            maxLength={8}
          />
          <p className="mt-1 text-xs text-gray-500">{tokenForm.symbol.length}/8 characters</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={tokenForm.description}
          onChange={(e) => setTokenForm({ ...tokenForm, description: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
          placeholder="Describe your token project..."
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Decimals
          </label>
          <select
            value={tokenForm.decimals}
            onChange={(e) => setTokenForm({ ...tokenForm, decimals: parseInt(e.target.value) })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
          >
            {[6, 7, 8, 9].map(decimal => (
              <option key={decimal} value={decimal}>{decimal}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Supply
          </label>
          <input
            type="number"
            value={tokenForm.totalSupply}
            onChange={(e) => setTokenForm({ ...tokenForm, totalSupply: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            placeholder="1000000"
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex">
          <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Token Information</p>
            <p>Your token will be created as an SPL token. The total supply will be minted to your launchpad for distribution via the bonding curve and liquidity provision.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BondingCurveStep({ curveForm, setCurveForm }: {
  curveForm: CurveForm;
  setCurveForm: (form: CurveForm) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Curve Type
        </label>
        <div className="grid md:grid-cols-2 gap-4">
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              curveForm.curveType === CurveType.Linear 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => setCurveForm({ ...curveForm, curveType: CurveType.Linear })}
          >
            <h3 className="font-medium text-gray-900 mb-2">Linear Curve</h3>
            <p className="text-sm text-gray-600">Price increases linearly: P = base + slope × supply</p>
            <p className="text-xs text-gray-500 mt-2">Best for steady, predictable price growth</p>
          </div>

          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              curveForm.curveType === CurveType.Exponential 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => setCurveForm({ ...curveForm, curveType: CurveType.Exponential })}
          >
            <h3 className="font-medium text-gray-900 mb-2">Exponential Curve</h3>
            <p className="text-sm text-gray-600">Price grows exponentially: P = base × multiplier^(supply/step)</p>
            <p className="text-xs text-gray-500 mt-2">Creates rapid price appreciation</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Base Price (SOL)
          </label>
          <input
            type="number"
            step="0.000001"
            value={curveForm.basePrice}
            onChange={(e) => setCurveForm({ ...curveForm, basePrice: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            placeholder="0.001"
          />
          <p className="mt-1 text-xs text-gray-500">Initial price per token</p>
        </div>

        {curveForm.curveType === CurveType.Linear && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slope (SOL per token)
            </label>
            <input
              type="number"
              step="0.0000001"
              value={curveForm.slope}
              onChange={(e) => setCurveForm({ ...curveForm, slope: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
              placeholder="0.0001"
            />
            <p className="mt-1 text-xs text-gray-500">Price increase per token sold</p>
          </div>
        )}

        {curveForm.curveType === CurveType.Exponential && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Multiplier
              </label>
              <input
                type="number"
                step="0.01"
                value={curveForm.slope}
                onChange={(e) => setCurveForm({ ...curveForm, slope: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                placeholder="1.001"
              />
              <p className="mt-1 text-xs text-gray-500">Exponential growth factor</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Step Size
              </label>
              <input
                type="number"
                value={curveForm.step}
                onChange={(e) => setCurveForm({ ...curveForm, step: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                placeholder="1000"
              />
              <p className="mt-1 text-xs text-gray-500">Tokens per exponential step</p>
            </div>
          </>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max Supply for Curve
        </label>
        <input
          type="number"
          value={curveForm.maxSupply}
          onChange={(e) => setCurveForm({ ...curveForm, maxSupply: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          placeholder="800000"
        />
        <p className="mt-1 text-xs text-gray-500">Maximum tokens available for curve trading</p>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-0.5 mr-3" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Curve Configuration</p>
            <p>Choose your parameters carefully. The bonding curve determines how your token price evolves as more tokens are sold. Remaining tokens will be used for initial liquidity in the Meteora pool.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FeesStep({ feeForm, setFeeForm }: {
  feeForm: FeeForm;
  setFeeForm: (form: FeeForm) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Creator Fee
        </label>
        <div className="space-y-4">
          <input
            type="range"
            min="0"
            max="500"
            step="25"
            value={feeForm.creatorFeeBps}
            onChange={(e) => setFeeForm({ ...feeForm, creatorFeeBps: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>0%</span>
            <span className="font-medium text-primary-600">{feeForm.creatorFeeBps / 100}%</span>
            <span>5%</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Fee charged on each buy/sell transaction, paid to you as the creator.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">Fee Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Platform Fee:</span>
            <span>1.0%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Your Creator Fee:</span>
            <span>{feeForm.creatorFeeBps / 100}%</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-medium">
            <span>Total Fee:</span>
            <span>{(100 + feeForm.creatorFeeBps) / 100}%</span>
          </div>
        </div>
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex">
          <InformationCircleIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3" />
          <div className="text-sm text-green-700">
            <p className="font-medium mb-1">Revenue Model</p>
            <p>Fees are collected from every buy and sell transaction. This provides ongoing revenue throughout the bonding curve phase and helps fund your project development.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GraduationStep({ graduationForm, setGraduationForm }: {
  graduationForm: GraduationForm;
  setGraduationForm: (form: GraduationForm) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Graduation Criteria</h3>
        <p className="text-gray-600 mb-6">
          Set the conditions that must be met for your token to graduate from the bonding curve to a Meteora Pool.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum SOL Raised
          </label>
          <input
            type="number"
            step="0.1"
            value={graduationForm.minSolRaised}
            onChange={(e) => setGraduationForm({ ...graduationForm, minSolRaised: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            placeholder="100"
          />
          <p className="mt-1 text-xs text-gray-500">SOL amount to collect from sales</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Tokens Sold
          </label>
          <input
            type="number"
            value={graduationForm.minSupplySold}
            onChange={(e) => setGraduationForm({ ...graduationForm, minSupplySold: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            placeholder="500000"
          />
          <p className="mt-1 text-xs text-gray-500">Number of tokens that must be sold</p>
        </div>
      </div>

      <div>
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="hasTimeLimit"
            checked={graduationForm.hasTimeLimit}
            onChange={(e) => setGraduationForm({ ...graduationForm, hasTimeLimit: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="hasTimeLimit" className="ml-2 text-sm font-medium text-gray-700">
            Set Time Limit
          </label>
        </div>
        
        {graduationForm.hasTimeLimit && (
          <input
            type="datetime-local"
            value={graduationForm.timeLimit}
            onChange={(e) => setGraduationForm({ ...graduationForm, timeLimit: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
          />
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex">
          <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">About Graduation</p>
            <p>When any of these criteria are met, your token can graduate to a Meteora Pool. This provides deeper liquidity, professional trading interface, and integration with the broader Solana DeFi ecosystem.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ReviewStep({ tokenForm, curveForm, feeForm, graduationForm }: {
  tokenForm: TokenForm;
  curveForm: CurveForm;
  feeForm: FeeForm;
  graduationForm: GraduationForm;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Review Your Launchpad</h3>
        <p className="text-gray-600">
          Please review all settings before deploying your launchpad to the blockchain.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-black mb-3">Token Details</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-black">Name:</dt>
                <dd className="font-medium text-black">{tokenForm.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black">Symbol:</dt>
                <dd className="font-medium text-black">{tokenForm.symbol}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black">Decimals:</dt>
                <dd className="font-medium text-black">{tokenForm.decimals}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black">Total Supply:</dt>
                <dd className="font-medium text-black">{parseInt(tokenForm.totalSupply).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="font-medium text-black mb-3">Bonding Curve</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-black">Type:</dt>
                <dd className="font-medium text-black">{curveForm.curveType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black">Base Price:</dt>
                <dd className="font-medium text-black">{curveForm.basePrice} SOL</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black">Max Supply:</dt>
                <dd className="font-medium text-black">{parseInt(curveForm.maxSupply).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-black mb-3">Fees</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-black">Creator Fee:</dt>
                <dd className="font-medium text-black">{feeForm.creatorFeeBps / 100}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black">Platform Fee:</dt>
                <dd className="font-medium text-black">1.0%</dd>
              </div>
              <div className="flex justify-between border-t pt-2">
                <dt className="text-black">Total Fee:</dt>
                <dd className="font-medium text-black">{(100 + feeForm.creatorFeeBps) / 100}%</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="font-medium text-black mb-3">Graduation</h4>
            <dl className="space-y-2 text-sm">
              {graduationForm.minSolRaised && (
                <div className="flex justify-between">
                  <dt className="text-black">Min SOL:</dt>
                  <dd className="font-medium text-black">{graduationForm.minSolRaised} SOL</dd>
                </div>
              )}
              {graduationForm.minSupplySold && (
                <div className="flex justify-between">
                  <dt className="text-black">Min Tokens:</dt>
                  <dd className="font-medium text-black">{parseInt(graduationForm.minSupplySold).toLocaleString()}</dd>
                </div>
              )}
              {graduationForm.hasTimeLimit && graduationForm.timeLimit && (
                <div className="flex justify-between">
                  <dt className="text-black">Time Limit:</dt>
                  <dd className="font-medium text-black">{new Date(graduationForm.timeLimit).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <div className="flex">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-0.5 mr-3" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Important Notice</p>
            <p>Once deployed, these settings cannot be changed. Please review carefully. You'll need to approve the transaction with your wallet to deploy the launchpad.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}