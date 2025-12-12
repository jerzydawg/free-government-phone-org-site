#!/bin/bash
# Copy and paste this entire script into your terminal

cd /Users/bartstrellz/govsaas/sites/free-government-phone-org-site

echo "Initializing git..."
[ ! -d .git ] && git init

echo "Setting remote..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/jerzydawg/free-government-phone-org-site.git

echo "Adding files..."
git add -A

echo "Committing..."
git commit -m "Fix sitemap error handling - ensure all sitemaps return valid XML" || echo "Already committed"

echo "Pushing to GitHub..."
git branch -M main 2>/dev/null
git push -u origin main --force

echo ""
echo "✅ Done! Vercel will auto-deploy."
echo "Check: https://vercel.com/jerzydawgs-projects/free-government-phone-org-site/deployments"

