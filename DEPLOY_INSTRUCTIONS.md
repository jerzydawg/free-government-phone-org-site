# Deployment Instructions

## Deploy to Vercel

The sitemap fixes have been applied. To deploy:

### Option 1: Using Vercel CLI (Recommended)

```bash
cd /Users/bartstrellz/govsaas/sites/free-government-phone-org-site
npx vercel@latest deploy --prod --yes
```

### Option 2: Using the deploy script

```bash
cd /Users/bartstrellz/govsaas/sites/free-government-phone-org-site
chmod +x deploy.sh
./deploy.sh
```

### Option 3: Git Push (if connected to Vercel)

If the project is connected to Vercel via Git, you can commit and push:

```bash
cd /Users/bartstrellz/govsaas/sites/free-government-phone-org-site
git add .
git commit -m "Fix sitemap error handling - ensure all sitemaps return valid XML"
git push origin main
```

## Test After Deployment

After deployment, test the sitemaps:

```bash
# Test sitemap-2.xml
curl -I https://free-government-phone.org/sitemap-2.xml

# Test all sitemaps
node test-sitemaps.js
```

## What Was Fixed

1. Added comprehensive error handling to all sitemap files (sitemap-2.xml.ts through sitemap-5.xml.ts)
2. Added error handling to sitemap-main.xml.ts and sitemap.xml.ts (index)
3. Improved error handling in sitemap-utils.ts
4. All sitemaps now return valid XML even if database queries fail
5. Returns HTTP 200 status even on errors to prevent breaking sitemap index

