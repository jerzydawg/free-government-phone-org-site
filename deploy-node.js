#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const projectDir = '/Users/bartstrellz/govsaas/sites/free-government-phone-org-site';

console.log('==========================================');
console.log('🚀 Deploying via Git');
console.log('==========================================\n');

try {
  process.chdir(projectDir);
  console.log('📁 Changed to:', process.cwd());
  
  // Initialize git
  console.log('\n📦 Initializing git...');
  try {
    execSync('git init', { stdio: 'inherit' });
  } catch (e) {
    console.log('Git already initialized');
  }
  
  // Set remote
  console.log('\n🔗 Setting remote...');
  try {
    execSync('git remote remove origin', { stdio: 'ignore' });
  } catch (e) {}
  try {
    execSync('git remote add origin https://github.com/jerzydawg/free-government-phone-org-site.git', { stdio: 'inherit' });
  } catch (e) {
    execSync('git remote set-url origin https://github.com/jerzydawg/free-government-phone-org-site.git', { stdio: 'inherit' });
  }
  
  // Add files
  console.log('\n📝 Adding files...');
  execSync('git add -A', { stdio: 'inherit' });
  
  // Commit
  console.log('\n💾 Committing...');
  try {
    execSync('git commit -m "Fix sitemap error handling - ensure all sitemaps return valid XML"', { stdio: 'inherit' });
  } catch (e) {
    console.log('No changes to commit or already committed');
  }
  
  // Set branch
  console.log('\n🌿 Setting branch to main...');
  try {
    execSync('git branch -M main', { stdio: 'inherit' });
  } catch (e) {}
  
  // Push
  console.log('\n🚀 Pushing to GitHub...');
  execSync('git push -u origin main --force', { stdio: 'inherit' });
  
  console.log('\n==========================================');
  console.log('✅ Deployment complete!');
  console.log('==========================================');
  console.log('\nCheck deployment at:');
  console.log('https://vercel.com/jerzydawgs-projects/free-government-phone-org-site/deployments\n');
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

