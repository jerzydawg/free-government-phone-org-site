#!/usr/bin/env bash
set -euo pipefail

cd /Users/bartstrellz/govsaas/sites/free-government-phone-org-site

echo "=========================================="
echo "🚀 Deploying free-government-phone.org"
echo "=========================================="
echo ""

# Build
echo "📦 Building project..."
npm run build
echo "✅ Build complete!"
echo ""

# Deploy
echo "🚀 Deploying to Vercel..."
npx vercel@latest deploy --prod --yes
echo ""

echo "✅ Deployment initiated!"
echo ""
echo "Check status at:"
echo "https://vercel.com/jerzydawgs-projects/free-government-phone-org-site/deployments"
