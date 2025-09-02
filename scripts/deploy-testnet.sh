#!/bin/bash

# Testnet Deployment Script for Launchpad
set -e

echo "🚀 Starting testnet deployment..."

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

# Build the program
echo "🔨 Building Anchor program..."
anchor build

# Get the program ID
PROGRAM_ID=$(solana address -k target/deploy/launchpad-keypair.json)
echo "📋 Program ID: $PROGRAM_ID"

# Deploy to testnet
echo "🚀 Deploying to testnet..."
anchor deploy --provider.cluster testnet

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
echo "3. Make sure you have testnet SOL in your wallet"
echo "4. Test the application on testnet"

