#!/bin/bash

# EventBase Vercel Deployment Script
# This script deploys the frontend to Vercel following best practices

set -e  # Exit on error

echo "🚀 EventBase Deployment Script"
echo "================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found!"
    echo "Install with: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found!"
    echo "Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo "📝 Please edit .env.local with your actual values"
        exit 1
    else
        echo "❌ .env.example not found! Please create .env.local manually"
        exit 1
    fi
fi

echo "✅ Environment file found"
echo ""

# Check required environment variables
echo "🔍 Checking environment variables..."
if grep -q "your_walletconnect_project_id_here" .env.local; then
    echo "⚠️  Warning: WalletConnect Project ID not set in .env.local"
    echo "Please update NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
fi

if grep -q "your_pinata_jwt_token" .env.local; then
    echo "⚠️  Warning: Pinata JWT not set in .env.local"
    echo "Please update NEXT_PUBLIC_PINATA_JWT"
fi

echo ""

# Run build test
echo "🔨 Testing build locally..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed! Fix errors before deploying"
    exit 1
fi

echo ""

# Ask deployment type
echo "Select deployment type:"
echo "1) Preview deployment (staging)"
echo "2) Production deployment"
read -p "Enter choice (1 or 2): " choice

echo ""

case $choice in
    1)
        echo "🚀 Deploying to preview..."
        vercel
        ;;
    2)
        echo "🚀 Deploying to production..."
        echo "⚠️  This will deploy to your production domain!"
        read -p "Are you sure? (y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            vercel --prod
        else
            echo "❌ Deployment cancelled"
            exit 0
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Visit your deployment URL"
echo "2. Test wallet connection"
echo "3. Verify smart contract interactions"
echo "4. Check IPFS image loading"
echo ""
echo "📚 Full guide: ../DEPLOYMENT_GUIDE.md"
