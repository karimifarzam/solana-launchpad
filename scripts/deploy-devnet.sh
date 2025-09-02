#!/bin/bash

# Devnet Deployment Script for Launchpad
set -e

echo "🚀 Starting devnet deployment..."
echo "================================="

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

# Set cluster to devnet
echo "🔧 Setting cluster to devnet..."
solana config set --url https://api.devnet.solana.com

# Check wallet balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance)
echo "Current balance: $BALANCE"

if [ "$BALANCE" = "0 SOL" ]; then
    echo "❌ No devnet SOL found!"
    echo "   Please get devnet SOL first:"
    echo "   solana airdrop 2"
    exit 1
fi

echo "✅ Sufficient SOL available for deployment"

# Build the program (if possible)
echo "🔨 Attempting to build Anchor program..."
if anchor build 2>/dev/null; then
    echo "✅ Build successful!"
    
    # Get the program ID
    PROGRAM_ID=$(solana address -k target/deploy/launchpad-keypair.json)
    echo "📋 Program ID: $PROGRAM_ID"
    
    # Deploy to devnet
    echo "🚀 Deploying to devnet..."
    anchor deploy --provider.cluster devnet
    
    # Update environment files with new program ID
    echo "📝 Updating environment files..."
    sed -i.bak "s/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=.*/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=$PROGRAM_ID/" env.local
    
    # Clean up backup files
    rm -f env.local.bak
    
    echo "✅ Deployment complete!"
    echo "📋 Program ID: $PROGRAM_ID"
    echo "🌐 Devnet URL: https://api.devnet.solana.com"
    echo "🔗 View on Solana Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
    
else
    echo "⚠️  Build failed (expected on Apple Silicon)"
    echo ""
    echo "🔧 Using existing program ID from Anchor.toml for testing..."
    
    # Use the program ID from Anchor.toml
    PROGRAM_ID=$(grep "launchpad = " Anchor.toml | grep devnet | cut -d'"' -f2)
    echo "📋 Using program ID: $PROGRAM_ID"
    
    if [ -z "$PROGRAM_ID" ]; then
        echo "❌ Could not extract program ID from Anchor.toml"
        echo "   Please check your Anchor.toml file"
        exit 1
    fi
    
    # Update environment files
    echo "📝 Updating environment files..."
    sed -i.bak "s/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=.*/NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=$PROGRAM_ID/" env.local
    
    # Clean up backup files
    rm -f env.local.bak
    
    echo "✅ Environment updated with program ID: $PROGRAM_ID"
    echo ""
    echo "📋 Note: Program is not deployed yet, but frontend can be tested"
    echo "   with the existing program ID from Anchor.toml"
fi

# Instructions for next steps
echo ""
echo "📋 Next steps:"
echo "1. Restart the frontend: npm run dev"
echo "2. Test the application on devnet"
echo "3. Make sure your wallet is connected to devnet"
echo "4. The network indicator should show 'Devnet'"
