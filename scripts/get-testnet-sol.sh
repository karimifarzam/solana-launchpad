#!/bin/bash

echo "💰 Getting Testnet SOL"
echo "========================"
echo ""
echo "The Solana CLI airdrop is rate limited. Here are alternative ways to get testnet SOL:"
echo ""
echo "1. 🌐 Web Faucet (Recommended):"
echo "   Visit: https://faucet.solana.com"
echo "   - Select 'Testnet' network"
echo "   - Enter your wallet address:"
echo ""

# Get the wallet address
WALLET_ADDRESS=$(solana address)
echo "   Your wallet address: $WALLET_ADDRESS"
echo ""
echo "2. 🔧 Alternative CLI faucets:"
echo "   Try: solana airdrop 1"
echo "   Or: solana airdrop 0.5"
echo ""
echo "3. 📱 Mobile Wallets:"
echo "   - Phantom: Settings → Developer Settings → Change Network → Testnet"
echo "   - Solflare: Settings → Networks → Add/Select Testnet"
echo ""
echo "4. 🚀 After getting SOL, run:"
echo "   ./scripts/deploy-testnet.sh"
echo ""
echo "Press Enter to open the web faucet..."
read -r

# Open the web faucet
open "https://faucet.solana.com"
