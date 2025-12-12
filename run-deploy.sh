#!/bin/bash
set -x
set -e

cd /Users/bartstrellz/govsaas/sites/free-government-phone-org-site

echo "=========================================="
echo "Starting deployment process..."
echo "=========================================="
echo ""

echo "Step 1: Building project..."
npm run build
echo "Build complete!"
echo ""

echo "Step 2: Deploying to Vercel..."
vercel deploy --prod --yes
echo ""

echo "=========================================="
echo "Deployment process completed!"
echo "=========================================="

