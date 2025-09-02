#!/bin/bash

# Multiple faucet options for getting testnet SOL
set -e

echo "💰 Multiple Testnet SOL Sources"
echo "==============================="

# Get wallet address
WALLET_ADDRESS=$(solana address)
echo "Your wallet address: $WALLET_ADDRESS"
echo ""

echo "🔧 Current network status:"
solana cluster-version
echo ""

echo "📋 Multiple faucet options:"
echo ""

echo "1. 🌐 Solana Official Faucet (Primary)"
echo "   URL: https://faucet.solana.com"
echo "   Steps:"
echo "   - Select 'Testnet' network"
echo "   - Enter your address: $WALLET_ADDRESS"
echo "   - Click 'Request SOL'"
echo ""

echo "2. 🌐 SolFaucet (Alternative)"
echo "   URL: https://solfaucet.com"
echo "   Steps:"
echo "   - Select 'Testnet' network"
echo "   - Enter your address: $WALLET_ADDRESS"
echo "   - Click 'Request SOL'"
echo ""

echo "3. 🌐 QuickNode Faucet (If you have account)"
echo "   URL: https://faucet.quicknode.com/solana/testnet"
echo "   Steps:"
echo "   - Connect wallet or enter address: $WALLET_ADDRESS"
echo "   - Request SOL"
echo ""

echo "4. 🔧 CLI Airdrop (Rate limited, but worth trying)"
echo "   Command: solana airdrop 0.5"
echo ""

echo "5. 📱 Mobile Wallet Faucets"
echo "   - Phantom: Settings → Developer Settings → Change Network → Testnet"
echo "   - Solflare: Settings → Networks → Add/Select Testnet"
echo ""

echo "6. 🔍 Check if account exists:"
echo "   Command: solana account $WALLET_ADDRESS"
echo ""

echo "7. 🌐 View on Solana Explorer:"
echo "   URL: https://explorer.solana.com/address/$WALLET_ADDRESS?cluster=testnet"
echo ""

echo "🚀 After getting SOL, verify with:"
echo "   solana balance"
echo ""

echo "Press Enter to open the primary Solana faucet..."
read -r

# Open the primary faucet
open "https://faucet.solana.com"

echo ""
echo "💡 Tips:"
echo "- Sometimes faucets have delays or require multiple attempts"
echo "- Make sure you're on the correct network (testnet)"
echo "- Try different browsers if one doesn't work"
echo "- Check the Solana Explorer to see if transactions appear"
echo ""
echo "🔍 To monitor for incoming SOL:"
echo "   watch -n 5 'solana balance'"

