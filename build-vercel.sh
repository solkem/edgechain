#!/bin/bash
set -e

echo "🚀 EdgeChain Vercel Build Script"
echo "=================================="
echo ""

# Navigate to UI package
cd packages/ui

echo "📦 Preparing Vercel-specific package.json..."
# Backup original package.json and use Vercel version
cp package.json package.json.backup
cp package.vercel.json package.json

echo "📦 Installing dependencies..."
# Install only UI dependencies directly
npm install

echo "🏗️  Building application..."
# Build the app
npm run build

echo "🔄 Restoring original package.json..."
# Restore original package.json
mv package.json.backup package.json

echo ""
echo "✅ Build complete!"
echo "📁 Output directory: packages/ui/dist"
