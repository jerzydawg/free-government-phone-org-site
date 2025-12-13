#!/usr/bin/env node

/**
 * Test script to verify sitemap endpoints return valid XML
 */

const https = require('https');
const http = require('http');

const SITE_URL = 'https://free-government-phone.org';
const SITEMAPS = [
  '/sitemap.xml',
  '/sitemap-main.xml',
  '/sitemap-2.xml',
  '/sitemap-3.xml',
  '/sitemap-4.xml',
  '/sitemap-5.xml',
];

function testSitemap(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const status = res.statusCode;
        const contentType = res.headers['content-type'] || '';
        const isValidXML = data.trim().startsWith('<?xml');
        const hasContent = data.trim().length > 100;
        
        resolve({
          url,
          status,
          contentType,
          isValidXML,
          hasContent,
          size: data.length,
          preview: data.substring(0, 200).replace(/\n/g, ' '),
        });
      });
    });
    
    req.on('error', (error) => {
      reject({ url, error: error.message });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject({ url, error: 'Timeout' });
    });
  });
}

async function testAllSitemaps() {
  console.log('🧪 Testing sitemaps for:', SITE_URL);
  console.log('='.repeat(60));
  console.log('');
  
  const results = [];
  
  for (const sitemap of SITEMAPS) {
    const url = `${SITE_URL}${sitemap}`;
    try {
      const result = await testSitemap(url);
      results.push(result);
      
      const statusIcon = result.status === 200 ? '✅' : '❌';
      const xmlIcon = result.isValidXML ? '✅' : '❌';
      const contentIcon = result.hasContent ? '✅' : '⚠️';
      
      console.log(`${statusIcon} ${sitemap}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Content-Type: ${result.contentType}`);
      console.log(`   Valid XML: ${xmlIcon}`);
      console.log(`   Has Content: ${contentIcon} (${result.size} bytes)`);
      console.log(`   Preview: ${result.preview}...`);
      console.log('');
    } catch (error) {
      results.push({ url, error: error.error || error.message });
      console.log(`❌ ${sitemap}`);
      console.log(`   Error: ${error.error || error.message}`);
      console.log('');
    }
  }
  
  console.log('='.repeat(60));
  const successCount = results.filter(r => r.status === 200 && r.isValidXML).length;
  const totalCount = SITEMAPS.length;
  
  console.log(`\n📊 Results: ${successCount}/${totalCount} sitemaps working correctly`);
  
  if (successCount === totalCount) {
    console.log('✅ All sitemaps are working!');
    process.exit(0);
  } else {
    console.log('⚠️  Some sitemaps need attention');
    process.exit(1);
  }
}

testAllSitemaps().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});




