#!/bin/bash

set -e

echo "🚀 Starting REAL devnet deployment..."
echo "======================================"

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo "❌ Error: Anchor.toml not found. Please run this from the project root."
    exit 1
fi

# Set cluster to devnet
echo "🔧 Setting cluster to devnet..."
solana config set --url https://api.devnet.solana.com

# Check wallet balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance)
echo "Current balance: $BALANCE"

# Check if we have enough SOL (need at least 5 SOL for deployment)
if [[ $BALANCE == *"0 SOL"* ]] || [[ $BALANCE == *"0.0"* ]]; then
    echo "❌ Insufficient SOL for deployment. You need at least 5 SOL."
    echo "💡 Get devnet SOL from: https://faucet.solana.com"
    exit 1
fi

echo "✅ Sufficient SOL available for deployment"

# Check if we have a built program
echo "🔍 Checking for existing build..."
if [ -f "target/deploy/launchpad.so" ]; then
    echo "✅ Found existing build: target/deploy/launchpad.so"
    echo "📋 Program size: $(ls -lh target/deploy/launchpad.so | awk '{print $5}')"
else
    echo "⚠️  No existing build found. You need to build the program first."
    echo ""
    echo "🔧 Options to build:"
    echo "1. Use GitHub Actions (recommended):"
    echo "   - Push your code to GitHub"
    echo "   - The workflow will build and deploy automatically"
    echo ""
    echo "2. Build on a Linux machine:"
    echo "   - Copy your project to a Linux machine"
    echo "   - Run: anchor build"
    echo "   - Copy the .so file back"
    echo ""
    echo "3. Use a cloud build service"
    echo ""
    echo "❌ Cannot proceed without a built program."
    exit 1
fi

# Get the program ID from the keypair
if [ -f "target/deploy/launchpad-keypair.json" ]; then
    PROGRAM_ID=$(solana address -k target/deploy/launchpad-keypair.json)
    echo "📋 Program ID from keypair: $PROGRAM_ID"
else
    echo "❌ Program keypair not found. Cannot determine program ID."
    exit 1
fi

# Check if program is already deployed
echo "🔍 Checking if program is already deployed..."
if solana program show $PROGRAM_ID > /dev/null 2>&1; then
    echo "✅ Program is already deployed on devnet!"
    echo "📋 Program ID: $PROGRAM_ID"
else
    echo "📤 Deploying program to devnet..."
    echo "⚠️  This will cost approximately 2-3 SOL"
    
    # Deploy the program
    solana program deploy target/deploy/launchpad.so
    
    echo "✅ Program deployed successfully!"
    echo "📋 Program ID: $PROGRAM_ID"
fi

# Update environment files
echo "📝 Updating environment files..."
if [ -f "env.local" ]; then
    sed -i '' "s/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=.*/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=$PROGRAM_ID/" env.local
    echo "✅ Updated env.local"
fi

if [ -f "env.devnet" ]; then
    sed -i '' "s/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=.*/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=$PROGRAM_ID/" env.devnet
    echo "✅ Updated env.devnet"
fi

# Update Anchor.toml
echo "📝 Updating Anchor.toml..."
sed -i '' "s/launchpad = \".*\"/launchpad = \"$PROGRAM_ID\"/" Anchor.toml
echo "✅ Updated Anchor.toml"

echo ""
echo "🎉 Deployment complete!"
echo "======================================"
echo "📋 Program ID: $PROGRAM_ID"
echo "🌐 Network: Devnet"
echo "💰 Cost: ~2-3 SOL"
echo ""
echo "🚀 Next steps:"
echo "1. Restart your frontend: npm run dev"
echo "2. Open http://localhost:3001 in your browser"
echo "3. Connect your devnet wallet"
echo "4. Test the real functionality with your devnet SOL!"
echo ""
echo "💡 Your program is now live on devnet and can execute real transactions!"

