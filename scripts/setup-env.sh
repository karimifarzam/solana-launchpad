#!/bin/bash

echo "🔧 Setting up environment for testnet..."
echo "========================================"

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create .env.local from env.testnet if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from env.testnet..."
    cp env.testnet .env.local
    echo "✅ .env.local created"
else
    echo "ℹ️  .env.local already exists"
fi

# Check if program ID is set
if grep -q "NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=$" .env.local; then
    echo "⚠️  Warning: Program ID not set in .env.local"
    echo "   This will be updated after deployment"
else
    echo "✅ Program ID already configured"
fi

echo ""
echo "🌐 Current environment configuration:"
echo "   Network: $(grep 'NEXT_PUBLIC_SOLANA_NETWORK' .env.local | cut -d'=' -f2)"
echo "   RPC URL: $(grep 'NEXT_PUBLIC_RPC_URL' .env.local | cut -d'=' -f2)"
echo "   Program ID: $(grep 'NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID' .env.local | cut -d'=' -f2)"

echo ""
echo "🚀 Next steps:"
echo "1. Get testnet SOL: ./scripts/get-testnet-sol.sh"
echo "2. Deploy to testnet: ./scripts/deploy-testnet.sh"
echo "3. Start frontend: npm run dev"

