#!/bin/bash

# Docker-based build script for Apple Silicon
set -e

echo "🐳 Building Solana program with Docker (x86_64 emulation)..."
echo "=========================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is available and running"

# Create Dockerfile for building
echo "📝 Creating Dockerfile for x86_64 build..."
cat > Dockerfile.build << 'EOF'
FROM --platform=linux/amd64 rust:1.81-slim

# Install required packages
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Solana tools
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.18.20/install)" && \
    ln -s /root/.local/share/solana/install/active_release/bin/solana /usr/local/bin/solana

# Install Anchor
RUN cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && \
    avm install 0.31.1 && \
    avm use 0.31.1

# Set working directory
WORKDIR /app

# Copy Cargo files
COPY Cargo.toml ./
COPY programs/launchpad/Cargo.toml ./programs/launchpad/
COPY programs/launchpad/src ./programs/launchpad/src

# Build the program
RUN anchor build

# Copy the built program to a volume
VOLUME /output
CMD cp -r target /output/
EOF

echo "✅ Dockerfile created"

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -f Dockerfile.build -t solana-build .

# Create output directory
mkdir -p docker-output

# Run the build container
echo "🚀 Running build container..."
docker run --rm \
    --platform linux/amd64 \
    -v "$(pwd)/docker-output:/output" \
    solana-build

# Copy the built files
echo "📁 Copying built files..."
cp -r docker-output/target .

# Clean up
echo "🧹 Cleaning up..."
rm -rf docker-output
rm Dockerfile.build
docker rmi solana-build

echo "✅ Build complete!"
echo "📁 Built files are in: target/deploy/"

# Check if the program was built
if [ -f "target/deploy/launchpad.so" ]; then
    echo "🎉 Successfully built launchpad.so"
    echo "   Size: $(ls -lh target/deploy/launchpad.so | awk '{print $5}')"
    echo ""
    echo "🚀 Now you can deploy to testnet:"
    echo "   ./scripts/deploy-testnet.sh"
else
    echo "❌ Build failed - launchpad.so not found"
    echo "   Check the Docker build logs above for errors"
    exit 1
fi
