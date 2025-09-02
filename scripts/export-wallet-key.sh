#!/bin/bash

# Export wallet private key for importing into browser wallets
set -e

echo "🔑 Exporting Wallet Private Key"
echo "================================"

# Check if keypair file exists
KEYPAIR_FILE="$HOME/.config/solana/id.json"
if [ ! -f "$KEYPAIR_FILE" ]; then
    echo "❌ Keypair file not found at: $KEYPAIR_FILE"
    exit 1
fi

echo "✅ Keypair file found"
echo ""

# Get the public key
PUBLIC_KEY=$(solana-keygen pubkey "$KEYPAIR_FILE")
echo "📋 Public Key: $PUBLIC_KEY"
echo ""

# Export private key in different formats
echo "🔐 Private Key Formats:"
echo "========================"

# Format 1: Base58 (most common for Solana wallets)
echo "1. Base58 Format (Recommended for most wallets):"
PRIVATE_KEY_BASE58=$(solana-keygen pubkey "$KEYPAIR_FILE" --outfile /dev/stdout 2>/dev/null | base58 2>/dev/null || echo "base58 not available")
if [ "$PRIVATE_KEY_BASE58" != "base58 not available" ]; then
    echo "   $PRIVATE_KEY_BASE58"
else
    echo "   base58 command not available, trying alternative method..."
fi

# Format 2: Raw bytes to hex
echo ""
echo "2. Hex Format (Alternative):"
echo "   Converting keypair to hex format..."

# Create a temporary script to convert the keypair
TEMP_SCRIPT=$(mktemp)
cat > "$TEMP_SCRIPT" << 'EOF'
import json
import base58
import sys

try:
    with open(sys.argv[1], 'r') as f:
        keypair = json.load(f)
    
    # Convert to base58
    private_key_base58 = base58.b58encode(bytes(keypair)).decode('utf-8')
    print(f"Base58 Private Key: {private_key_base58}")
    
    # Convert to hex
    private_key_hex = bytes(keypair).hex()
    print(f"Hex Private Key: {private_key_hex}")
    
except Exception as e:
    print(f"Error: {e}")
    print("Trying alternative method...")
    
    # Alternative: use solana-keygen
    import subprocess
    try:
        result = subprocess.run(['solana-keygen', 'pubkey', sys.argv[1]], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"Public key: {result.stdout.strip()}")
            print("Use 'solana-keygen pubkey --outfile <filename>' to export private key")
    except:
        print("Could not export private key automatically")
EOF

# Try to run the Python script
if command -v python3 &> /dev/null; then
    echo "   Running Python conversion..."
    python3 "$TEMP_SCRIPT" "$KEYPAIR_FILE" 2>/dev/null || echo "   Python conversion failed"
elif command -v python &> /dev/null; then
    echo "   Running Python conversion..."
    python "$TEMP_SCRIPT" "$KEYPAIR_FILE" 2>/dev/null || echo "   Python conversion failed"
else
    echo "   Python not available for conversion"
fi

# Clean up
rm -f "$TEMP_SCRIPT"

echo ""
echo "📱 Import Instructions:"
echo "======================="
echo "1. Open your wallet (Phantom, Solflare, etc.)"
echo "2. Switch to DEVNET network"
echo "3. Go to Import/Add Wallet"
echo "4. Choose 'Private Key' option"
echo "5. Copy and paste the private key above"
echo "6. Confirm import"
echo ""
echo "⚠️  Security Note:"
echo "   - Keep your private key secure"
echo "   - Don't share it with anyone"
echo "   - This key controls your devnet SOL"
echo ""
echo "🔍 After importing:"
echo "   - You should see your 12 SOL balance"
echo "   - The wallet should show 'Devnet' network"
echo "   - You can now test your launchpad frontend"

