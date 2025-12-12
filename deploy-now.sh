#!/bin/bash
set -e

cd /Users/bartstrellz/govsaas/sites/free-government-phone-org-site

echo "🚀 Deploying free-government-phone.org to Vercel..."
echo ""

# Check if vercel is available
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel@latest
fi

# Build the project first
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel production..."
vercel deploy --prod --yes --scope jerzydawgs-projects --token "${VERCEL_TOKEN:-}" 2>&1

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing sitemaps in 10 seconds..."
sleep 10

# Test the sitemaps
echo ""
echo "Testing sitemap-2.xml..."
curl -s -o /dev/null -w "Status: %{http_code}\n" https://free-government-phone.org/sitemap-2.xml

echo ""
echo "✅ Done!"

