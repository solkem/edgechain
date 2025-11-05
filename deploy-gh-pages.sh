#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 EdgeChain GitHub Pages Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if on correct branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "⚠️  Warning: You're on branch '$current_branch', not 'main'"
    echo "   GitHub Pages deploys from 'main' branch"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Step 1: Installing dependencies..."
yarn install --immutable

echo ""
echo "🏗️  Step 2: Building UI with GitHub Pages base path..."
export VITE_BASE_PATH=/edgechain-midnight-hackathon/
yarn workspace edgechain-ui build

echo ""
echo "✅ Build complete! Output in packages/ui/dist/"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Commit and push this deployment workflow:"
echo "   git add .github/workflows/deploy-gh-pages.yml"
echo "   git commit -m 'feat: Add GitHub Pages deployment workflow'"
echo "   git push origin main"
echo ""
echo "2. Enable GitHub Pages in repository settings:"
echo "   → Go to: https://github.com/solkem/edgechain-midnight-hackathon/settings/pages"
echo "   → Source: GitHub Actions"
echo "   → Save"
echo ""
echo "3. Workflow will deploy automatically on push to main"
echo "   → Monitor: https://github.com/solkem/edgechain-midnight-hackathon/actions"
echo ""
echo "4. Once deployed, your app will be available at:"
echo "   🌐 https://solkem.github.io/edgechain-midnight-hackathon/"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
