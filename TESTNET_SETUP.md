# Testnet Setup Guide

This guide will help you deploy and test your Solana Launchpad on testnet.

## Prerequisites

1. **Solana CLI** - Install from [https://docs.solana.com/cli/install-solana-cli-tools](https://docs.solana.com/cli/install-solana-cli-tools)
2. **Anchor CLI** - Already installed (version 0.31.1)
3. **Node.js & npm** - For frontend development

## Step 1: Configure Solana for Testnet

```bash
# Set cluster to testnet
solana config set --url https://api.testnet.solana.com

# Check your current configuration
solana config get

# Verify connection
solana cluster-version
```

## Step 2: Get Testnet SOL

You'll need testnet SOL to deploy your program:

```bash
# Check your current balance
solana balance

# If you need testnet SOL, use the faucet
# Visit: https://faucet.solana.com
# Or use the CLI:
solana airdrop 2
```

## Step 3: Deploy to Testnet

Use our automated deployment script:

```bash
# Make sure you're in the project directory
cd /Users/home/Desktop/Launchpad

# Run the testnet deployment script
./scripts/deploy-testnet.sh
```

This script will:
- Build your Anchor program
- Deploy it to testnet
- Update environment files with the new program ID
- Provide next steps

## Step 4: Configure Frontend

After deployment, copy the testnet environment:

```bash
# Copy testnet config to local environment
cp env.testnet .env.local
```

## Step 5: Start the Frontend

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

## Step 6: Test Your Application

1. **Connect Wallet** - Use Phantom, Solflare, or another Solana wallet
2. **Switch to Testnet** - Make sure your wallet is connected to testnet
3. **Test Features** - Try creating a launchpad, buying tokens, etc.

## Environment Variables

Your `.env.local` file should contain:

```env
NEXT_PUBLIC_SOLANA_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://api.testnet.solana.com
NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
NEXT_PUBLIC_METEORA_API_URL=https://api.meteora.ag
NEXT_PUBLIC_APP_NAME=Launchpad
NEXT_PUBLIC_APP_DESCRIPTION=Solana Token Launchpad
NEXT_PUBLIC_IS_TESTNET=true
NEXT_PUBLIC_FAUCET_URL=https://faucet.solana.com
```

## Useful Commands

```bash
# Check program deployment
solana program show YOUR_PROGRAM_ID

# View program logs
solana logs YOUR_PROGRAM_ID

# Check account info
solana account YOUR_ACCOUNT_ADDRESS

# Build program
anchor build

# Run tests
anchor test --skip-local-validator

# Deploy manually
anchor deploy --provider.cluster testnet
```

## Troubleshooting

### Common Issues

1. **Insufficient SOL** - Use the faucet to get more testnet SOL
2. **RPC Errors** - Testnet can be slow, try again or use a different RPC endpoint
3. **Build Errors** - Make sure all dependencies are installed and Rust is up to date

### RPC Endpoints

If the default testnet RPC is slow, you can use alternatives:

```env
# QuickNode (requires account)
NEXT_PUBLIC_RPC_URL=https://your-endpoint.solana-testnet.quiknode.pro/

# Alchemy (requires account)
NEXT_PUBLIC_RPC_URL=https://solana-testnet.g.alchemy.com/v2/your-api-key

# GenesysGo
NEXT_PUBLIC_RPC_URL=https://ssc-dao.genesysgo.net
```

### Network Switching

To switch between networks in your wallet:
- **Phantom**: Settings → Developer Settings → Change Network
- **Solflare**: Settings → Networks → Add/Select Testnet

## Next Steps

After successful testnet deployment:

1. **Test all functionality** thoroughly
2. **Fix any bugs** found during testing
3. **Optimize gas costs** and performance
4. **Prepare for mainnet** deployment

## Support

If you encounter issues:
1. Check the Solana Discord: [https://discord.gg/solana](https://discord.gg/solana)
2. Check Anchor Discord: [https://discord.gg/8HkmB5g](https://discord.gg/8HkmB5g)
3. Review Solana documentation: [https://docs.solana.com](https://docs.solana.com)
