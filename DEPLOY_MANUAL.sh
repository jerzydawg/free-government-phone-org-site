#!/bin/bash
# Manual deployment script - run this in your terminal

cd /Users/bartstrellz/govsaas/sites/free-government-phone-org-site

echo "=========================================="
echo "Deploying sitemap fixes via Git"
echo "=========================================="

# Initialize git if needed
if [ ! -d .git ]; then
    git init
fi

# Set remote
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/jerzydawg/free-government-phone-org-site.git

# Add and commit
git add -A
git commit -m "Fix sitemap error handling - ensure all sitemaps return valid XML" || echo "Already committed"

# Push
git branch -M main 2>/dev/null || true
git push -u origin main --force

echo "Done! Check: https://vercel.com/jerzydawgs-projects/free-government-phone-org-site/deployments"

