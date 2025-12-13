#!/usr/bin/env bash
set -e
set -x

PROJECT_DIR="/Users/bartstrellz/govsaas/sites/free-government-phone-org-site"
cd "$PROJECT_DIR"

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
echo "🔗 Configuring git remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/jerzydawg/free-government-phone-org-site.git
echo "✅ Remote configured: $(git remote get-url origin)"
echo ""

# Check what files changed
echo "📝 Checking changes..."
git add -A
CHANGED_FILES=$(git status --short | wc -l | tr -d ' ')
echo "✅ Found $CHANGED_FILES changed files"
git status --short | head -10
echo ""

# Commit
echo "💾 Committing changes..."
git commit -m "Fix sitemap error handling - ensure all sitemaps return valid XML" || {
    echo "⚠️  No changes to commit (may already be committed)"
}
echo ""

# Set branch to main
echo "🌿 Setting branch to main..."
git branch -M main 2>/dev/null || true
echo ""

# Push to trigger Vercel deployment
echo "🚀 Pushing to GitHub..."
echo "This will trigger automatic Vercel deployment..."
git push -u origin main --force 2>&1 || {
    echo "⚠️  Push failed, trying master branch..."
    git branch -M master 2>/dev/null || true
    git push -u origin master --force 2>&1
}

echo ""
echo "=========================================="
echo "✅ Git push complete!"
echo "=========================================="
echo ""
echo "Vercel will automatically deploy from GitHub."
echo ""
echo "Check deployment status at:"
echo "https://vercel.com/jerzydawgs-projects/free-government-phone-org-site/deployments"
echo ""
echo "Or GitHub:"
echo "https://github.com/jerzydawg/free-government-phone-org-site"
echo ""




