import https from 'https';
import { parseString } from 'xml2js';
import fs from 'fs';

const SITE_URL = 'https://free-government-phone.org';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    https.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapValidator/1.0)' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: Date.now() - startTime,
        });
      });
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Timeout')); });
  });
}

function parseXML(xmlString) {
  return new Promise((resolve, reject) => {
    parseString(xmlString, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function validateSitemap() {
  const issues = [];
  const warnings = [];
  
  log('\n🔍 Advanced Sitemap Validation...\n', 'cyan');
  
  try {
    // Fetch sitemap
    log('📥 Fetching sitemap...', 'yellow');
    const response = await fetchURL(SITEMAP_URL);
    
    if (response.status !== 200) {
      issues.push(`Sitemap returned HTTP ${response.status}`);
      return { issues, warnings };
    }
    
    // Check Content-Type
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('xml')) {
      warnings.push(`Content-Type is "${contentType}" (expected application/xml)`);
    }
    
    // Check size (GSC limit is 50MB uncompressed)
    const sizeMB = response.body.length / (1024 * 1024);
    if (sizeMB > 50) {
      issues.push(`Sitemap is ${sizeMB.toFixed(2)}MB (GSC limit is 50MB)`);
    } else if (sizeMB > 10) {
      warnings.push(`Sitemap is ${sizeMB.toFixed(2)}MB (consider splitting if > 50MB)`);
    }
    
    // Parse XML
    log('🔨 Parsing XML...', 'yellow');
    const parsed = await parseXML(response.body);
    
    if (!parsed.urlset) {
      issues.push('Missing <urlset> root element');
      return { issues, warnings };
    }
    
    // Check namespace
    if (!parsed.urlset.$ || !parsed.urlset.$['xmlns']) {
      warnings.push('Missing xmlns namespace declaration');
    }
    
    const urls = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];
    log(`✅ Found ${urls.length} URLs\n`, 'green');
    
    // Validate URL count (GSC limit is 50,000 URLs per sitemap)
    if (urls.length > 50000) {
      issues.push(`Sitemap contains ${urls.length} URLs (GSC limit is 50,000)`);
    }
    
    // Validate each URL
    log('🔍 Validating URL structure...', 'yellow');
    const urlIssues = [];
    const urlWarnings = [];
    const sampleUrls = urls.slice(0, 100); // Check first 100
    
    sampleUrls.forEach((urlObj, index) => {
      if (!urlObj.loc || !urlObj.loc[0]) {
        urlIssues.push(`URL ${index + 1}: Missing <loc> tag`);
        return;
      }
      
      const loc = urlObj.loc[0];
      
      // Validate URL format
      try {
        const url = new URL(loc);
        if (url.origin !== SITE_URL) {
          urlWarnings.push(`URL ${index + 1}: Different domain (${url.origin}): ${loc}`);
        }
        if (!loc.endsWith('/')) {
          urlWarnings.push(`URL ${index + 1}: Missing trailing slash: ${loc}`);
        }
      } catch (e) {
        urlIssues.push(`URL ${index + 1}: Invalid URL format: ${loc}`);
      }
      
      // Check lastmod format
      if (urlObj.lastmod && urlObj.lastmod[0]) {
        const lastmod = urlObj.lastmod[0];
        if (!/^\d{4}-\d{2}-\d{2}/.test(lastmod)) {
          urlWarnings.push(`URL ${index + 1}: Invalid lastmod format: ${lastmod}`);
        }
      } else {
        urlWarnings.push(`URL ${index + 1}: Missing <lastmod> tag`);
      }
      
      // Check priority (should be 0.0 to 1.0)
      if (urlObj.priority && urlObj.priority[0]) {
        const priority = parseFloat(urlObj.priority[0]);
        if (priority < 0 || priority > 1) {
          urlWarnings.push(`URL ${index + 1}: Invalid priority value: ${priority}`);
        }
      }
      
      // Check changefreq
      if (urlObj.changefreq && urlObj.changefreq[0]) {
        const validFreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
        if (!validFreqs.includes(urlObj.changefreq[0].toLowerCase())) {
          urlWarnings.push(`URL ${index + 1}: Invalid changefreq: ${urlObj.changefreq[0]}`);
        }
      }
    });
    
    issues.push(...urlIssues);
    warnings.push(...urlWarnings);
    
    // Test random sample of city pages
    log('\n🏙️  Testing random city pages...', 'yellow');
    const cityUrls = urls.filter(u => {
      const path = new URL(u.loc[0]).pathname;
      return /^\/[a-z]{2}\/[^\/]+\/$/.test(path);
    });
    
    const randomCities = cityUrls
      .sort(() => Math.random() - 0.5)
      .slice(0, 20);
    
    let cityTestPassed = 0;
    let cityTestFailed = 0;
    
    for (const city of randomCities) {
      try {
        const cityResponse = await fetchURL(city.loc[0]);
        if (cityResponse.status === 200) {
          cityTestPassed++;
          // Check for essential SEO elements
          const hasTitle = cityResponse.body.includes('<title>') && 
                          !cityResponse.body.includes('<title></title>');
          const hasH1 = cityResponse.body.includes('<h1');
          const hasMetaDesc = cityResponse.body.includes('name="description"');
          
          if (!hasTitle || !hasH1 || !hasMetaDesc) {
            warnings.push(`City page missing SEO elements: ${city.loc[0]}`);
          }
        } else {
          cityTestFailed++;
          issues.push(`City page returned ${cityResponse.status}: ${city.loc[0]}`);
        }
        await new Promise(r => setTimeout(r, 50));
      } catch (error) {
        cityTestFailed++;
        issues.push(`City page error: ${city.loc[0]} - ${error.message}`);
      }
    }
    
    log(`  ✅ Passed: ${cityTestPassed}/${randomCities.length}`, cityTestFailed === 0 ? 'green' : 'yellow');
    if (cityTestFailed > 0) {
      log(`  ❌ Failed: ${cityTestFailed}/${randomCities.length}`, 'red');
    }
    
    // Check for duplicate URLs
    log('\n🔍 Checking for duplicate URLs...', 'yellow');
    const urlSet = new Set();
    const duplicates = [];
    urls.forEach((urlObj, index) => {
      const loc = urlObj.loc[0];
      if (urlSet.has(loc)) {
        duplicates.push(`Duplicate URL at index ${index + 1}: ${loc}`);
      }
      urlSet.add(loc);
    });
    
    if (duplicates.length > 0) {
      issues.push(...duplicates);
      log(`  ❌ Found ${duplicates.length} duplicate URLs`, 'red');
    } else {
      log('  ✅ No duplicate URLs found', 'green');
    }
    
  } catch (error) {
    issues.push(`Validation error: ${error.message}`);
  }
  
  return { issues, warnings };
}

// Run validation
validateSitemap()
  .then(({ issues, warnings }) => {
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 VALIDATION REPORT', 'cyan');
    log('='.repeat(60), 'cyan');
    
    log(`\n❌ Issues: ${issues.length}`, issues.length > 0 ? 'red' : 'green');
    log(`⚠️  Warnings: ${warnings.length}`, warnings.length > 0 ? 'yellow' : 'green');
    
    if (issues.length > 0) {
      log('\n❌ CRITICAL ISSUES:', 'red');
      issues.slice(0, 20).forEach(issue => log(`  - ${issue}`, 'red'));
      if (issues.length > 20) {
        log(`  ... and ${issues.length - 20} more issues`, 'red');
      }
    }
    
    if (warnings.length > 0) {
      log('\n⚠️  WARNINGS:', 'yellow');
      warnings.slice(0, 20).forEach(warning => log(`  - ${warning}`, 'yellow'));
      if (warnings.length > 20) {
        log(`  ... and ${warnings.length - 20} more warnings`, 'yellow');
      }
    }
    
    log('\n' + '='.repeat(60), 'cyan');
    if (issues.length === 0) {
      log('✅ SITEMAP PASSES ALL VALIDATION CHECKS', 'green');
      log('✅ READY FOR GOOGLE SEARCH CONSOLE', 'green');
    } else {
      log('⚠️  SITEMAP HAS ISSUES - FIX BEFORE SUBMITTING', 'yellow');
    }
    log('='.repeat(60) + '\n', 'cyan');
    
    process.exit(issues.length > 0 ? 1 : 0);
  })
  .catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
