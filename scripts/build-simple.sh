#!/bin/bash

# Simple build script with Apple Silicon workarounds
set -e

echo "🔨 Simple build script for Apple Silicon..."
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project structure verified"

# Try to use local Rust toolchain
echo "🔧 Checking local Rust toolchain..."
if command -v rustc &> /dev/null; then
    echo "✅ Rust found: $(rustc --version)"
else
    echo "❌ Rust not found. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Try to add SBF target to local toolchain
echo "🎯 Adding SBF target to local toolchain..."
if rustup target list | grep -q sbf; then
    echo "✅ SBF target already available"
else
    echo "⚠️  SBF target not available in local toolchain"
    echo "   This is expected on Apple Silicon"
fi

# Try to build with local toolchain
echo "🔨 Attempting build with local toolchain..."
if anchor build 2>/dev/null; then
    echo "🎉 Build successful with local toolchain!"
    echo "📁 Built files are in: target/deploy/"
    
    if [ -f "target/deploy/launchpad.so" ]; then
        echo "✅ launchpad.so built successfully"
        echo "   Size: $(ls -lh target/deploy/launchpad.so | awk '{print $5}')"
        echo ""
        echo "🚀 Now you can deploy to testnet:"
        echo "   ./scripts/deploy-testnet.sh"
    else
        echo "❌ launchpad.so not found despite successful build"
    fi
    exit 0
else
    echo "⚠️  Local build failed (expected on Apple Silicon)"
fi

echo ""
echo "🔧 Build Options for Apple Silicon:"
echo "1. Use pre-built binary (if available)"
echo "2. Build on remote server/CI"
echo "3. Use Docker with x86_64 emulation (complex)"
echo "4. Use existing program ID for testing"
echo ""

# Check if we have a pre-built binary
if [ -f "target/deploy/launchpad.so" ]; then
    echo "✅ Found pre-built binary: target/deploy/launchpad.so"
    echo "   Size: $(ls -lh target/deploy/launchpad.so | awk '{print $5}')"
    echo ""
    echo "🚀 You can now deploy to testnet:"
    echo "   ./scripts/deploy-testnet.sh"
    exit 0
fi

echo "❌ No pre-built binary found."
echo ""
echo "🔧 Recommended approach for now:"
echo "   Use the existing program ID from Anchor.toml for testing"
echo "   This allows you to test the frontend while we solve the build issue"
echo ""
echo "🚀 Run this to set up for testing:"
echo "   ./scripts/deploy-testnet-simple.sh"


