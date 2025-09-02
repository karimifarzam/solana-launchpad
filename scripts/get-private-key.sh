#!/bin/bash

# Simple script to get private key for wallet import
echo "🔑 Getting Private Key for Wallet Import"
echo "========================================="

KEYPAIR_FILE="$HOME/.config/solana/id.json"

if [ ! -f "$KEYPAIR_FILE" ]; then
    echo "❌ Keypair file not found"
    exit 1
fi

echo "✅ Keypair file found: $KEYPAIR_FILE"
echo ""

# Get public key
PUBLIC_KEY=$(solana-keygen pubkey "$KEYPAIR_FILE")
echo "📋 Public Key: $PUBLIC_KEY"
echo ""

echo "🔐 To get your private key, run this command:"
echo "   solana-keygen pubkey $KEYPAIR_FILE --outfile private_key.txt"
echo ""
echo "📱 Then import into your wallet:"
echo "1. Open Phantom/Solflare wallet"
echo "2. Switch to DEVNET network"
echo "3. Go to Import Wallet"
echo "4. Choose 'Private Key'"
echo "5. Copy the contents of private_key.txt"
echo "6. Paste and import"
echo ""
echo "💡 Alternative: Use the keypair file directly"
echo "   Some wallets allow importing the entire keypair file"
echo "   Try copying the contents of: $KEYPAIR_FILE"


