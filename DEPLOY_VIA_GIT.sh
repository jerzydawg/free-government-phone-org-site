#!/usr/bin/env bash
set -e

cd /Users/bartstrellz/govsaas/sites/free-government-phone-org-site

echo "=========================================="
echo "🚀 Deploying via Git Push"
echo "Repository: jerzydawg/free-government-phone-org-site"
echo "=========================================="
echo ""

# Initialize git if needed
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Set remote
echo "🔗 Setting git remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/jerzydawg/free-government-phone-org-site.git

# Add all changes
echo "📝 Staging changes..."
git add -A

# Commit
echo "💾 Committing changes..."
git commit -m "Fix sitemap error handling - ensure all sitemaps return valid XML" || echo "No changes to commit"

# Push to trigger Vercel deployment
echo "🚀 Pushing to GitHub (this will trigger Vercel deployment)..."
git branch -M main 2>/dev/null || true
git push -u origin main --force || git push -u origin master --force

echo ""
echo "✅ Push complete! Vercel will automatically deploy."
echo ""
echo "Check deployment status at:"
echo "https://vercel.com/jerzydawgs-projects/free-government-phone-org-site/deployments"
echo ""




