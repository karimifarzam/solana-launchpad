#!/bin/bash

# Solana Launchpad Deployment Script

set -e

echo "🚀 Solana Launchpad Deployment Script"
echo "======================================"

# Check if network is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/deploy.sh [devnet|testnet|mainnet]"
    exit 1
fi

NETWORK=$1

echo "📡 Deploying to $NETWORK..."

# Set Solana config
case $NETWORK in
    devnet)
        solana config set --url https://api.devnet.solana.com
        ;;
    testnet)
        solana config set --url https://api.testnet.solana.com
        ;;
    mainnet)
        solana config set --url https://api.mainnet-beta.solana.com
        ;;
    *)
        echo "❌ Invalid network. Use devnet, testnet, or mainnet"
        exit 1
        ;;
esac

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first."
    exit 1
fi

# Check wallet
echo "🔑 Checking wallet..."
WALLET_BALANCE=$(solana balance --lamports)
echo "Wallet balance: $WALLET_BALANCE lamports"

if [ "$WALLET_BALANCE" -lt 10000000 ]; then
    echo "⚠️ Wallet balance is low. You may need more SOL for deployment."
    if [ "$NETWORK" = "devnet" ] || [ "$NETWORK" = "testnet" ]; then
        echo "💰 Requesting airdrop..."
        solana airdrop 2
        sleep 5
    fi
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install it first:"
    echo "cargo install --git https://github.com/coral-xyz/anchor anchor-cli"
    exit 1
fi

# Build the program
echo "🔨 Building Anchor program..."
anchor build

# Deploy the program
echo "📦 Deploying to $NETWORK..."
anchor deploy --provider.cluster $NETWORK

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/launchpad-keypair.json)
echo "✅ Program deployed successfully!"
echo "Program ID: $PROGRAM_ID"

# Update Anchor.toml with new program ID
echo "📝 Updating Anchor.toml..."
sed -i.bak "s/launchpad = \".*\"/launchpad = \"$PROGRAM_ID\"/g" Anchor.toml

# Initialize global state (optional, can be done later)
read -p "🔧 Initialize global state? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🏛️ Initializing global state..."
    # This would call the initialize instruction
    echo "⚠️ Please manually initialize the global state using the SDK or frontend"
fi

# Update environment variables
echo "🌍 Updating environment variables..."
cat > .env.local << EOF
NEXT_PUBLIC_SOLANA_NETWORK=$NETWORK
NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=$PROGRAM_ID
NEXT_PUBLIC_METEORA_PROGRAM_ID=LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo
EOF

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Initialize global state using the frontend or SDK"
echo "2. Test the deployment with a sample launchpad"
echo "3. Update your frontend configuration if needed"
echo ""
echo "🔗 Program ID: $PROGRAM_ID"
echo "🌐 Network: $NETWORK"
echo "💼 Deployer: $(solana address)"
echo ""
echo "Happy launching! 🎉"