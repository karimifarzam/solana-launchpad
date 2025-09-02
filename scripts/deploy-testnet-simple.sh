#!/bin/bash

# Simplified Testnet Deployment Script for Apple Silicon
set -e

echo "🚀 Starting simplified testnet deployment for Apple Silicon..."
echo "=============================================================="

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first."
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install it first."
    exit 1
fi

# Set cluster to testnet
echo "🔧 Setting cluster to testnet..."
solana config set --url https://api.testnet.solana.com

# Check wallet balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance)
echo "Current balance: $BALANCE"

if [ "$BALANCE" = "0 SOL" ]; then
    echo "⚠️  Warning: No testnet SOL found!"
    echo "   Please get testnet SOL first:"
    echo "   ./scripts/get-testnet-sol.sh"
    echo ""
    echo "   Or visit: https://faucet.solana.com"
    exit 1
fi

echo ""
echo "🔨 Build Options for Apple Silicon:"
echo "1. Use pre-built binary (if available)"
echo "2. Build on remote server/CI"
echo "3. Use Docker with x86_64 emulation"
echo ""

# Check if we have a pre-built binary
if [ -f "target/deploy/launchpad.so" ]; then
    echo "✅ Found pre-built binary: target/deploy/launchpad.so"
    echo "   Using existing build..."
else
    echo "❌ No pre-built binary found."
    echo ""
    echo "🔧 Build Options:"
    echo "   Option 1: Use GitHub Actions or CI to build"
    echo "   Option 2: Use Docker with x86_64 emulation"
    echo "   Option 3: Build on a Linux/x86_64 machine"
    echo ""
    echo "   For now, let's try to use a sample program ID for testing..."
    
    # Use the program ID from Anchor.toml for now
    PROGRAM_ID=$(grep "launchpad = " Anchor.toml | grep testnet | cut -d'"' -f2)
    echo "📋 Using program ID from Anchor.toml: $PROGRAM_ID"
    
    # Update environment files
    echo "📝 Updating environment files..."
    sed -i.bak "s/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=.*/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=$PROGRAM_ID/" env.testnet
    sed -i.bak "s/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=.*/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=$PROGRAM_ID/" env.local
    
    # Clean up backup files
    rm -f env.testnet.bak env.local.bak
    
    echo "✅ Environment updated with program ID: $PROGRAM_ID"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy env.testnet to .env.local: cp env.testnet .env.local"
    echo "2. Start the frontend: npm run dev"
    echo "3. Test the application (note: program may not be deployed yet)"
    echo ""
    echo "🔧 To actually deploy the program, you'll need to:"
    echo "   - Build on a Linux/x86_64 machine, or"
    echo "   - Use GitHub Actions/CI, or"
    echo "   - Use Docker with x86_64 emulation"
    exit 0
fi

# If we have a binary, try to deploy
echo "🚀 Attempting to deploy existing binary..."
anchor deploy --provider.cluster testnet

# Get the program ID
PROGRAM_ID=$(solana address -k target/deploy/launchpad-keypair.json)
echo "📋 Program ID: $PROGRAM_ID"

# Update environment files with new program ID
echo "📝 Updating environment files..."
sed -i.bak "s/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=.*/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=$PROGRAM_ID/" env.testnet
sed -i.bak "s/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=.*/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=$PROGRAM_ID/" env.local

# Clean up backup files
rm -f env.testnet.bak env.local.bak

echo "✅ Deployment complete!"
echo "📋 Program ID: $PROGRAM_ID"
echo "🌐 Testnet URL: https://api.testnet.solana.com"
echo "🔗 View on Solana Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=testnet"

# Instructions for next steps
echo ""
echo "📋 Next steps:"
echo "1. Copy env.testnet to .env.local: cp env.testnet .env.local"
echo "2. Start the frontend: npm run dev"
echo "3. Test the application on testnet"

