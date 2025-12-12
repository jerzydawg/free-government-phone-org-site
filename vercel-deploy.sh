#!/bin/bash
set -e

PROJECT_DIR="/Users/bartstrellz/govsaas/sites/free-government-phone-org-site"
cd "$PROJECT_DIR"

echo "=========================================="
echo "🚀 Deploying to Vercel"
echo "Project: free-government-phone-org-site"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Wrong directory?"
    exit 1
fi

echo "📦 Current directory: $(pwd)"
echo ""

# Build first
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Deploy
echo "🚀 Deploying to Vercel production..."
echo ""

# Try with scope if available
if vercel deploy --prod --yes --scope jerzydawgs-projects 2>&1; then
    echo ""
    echo "✅ Deployment successful!"
elif vercel deploy --prod --yes 2>&1; then
    echo ""
    echo "✅ Deployment successful!"
else
    echo ""
    echo "⚠️  Deployment command completed. Check Vercel dashboard for status."
fi

echo ""
echo "=========================================="
echo "Deployment initiated!"
echo "Check: https://vercel.com/jerzydawgs-projects/free-government-phone-org-site/deployments"
echo "=========================================="

