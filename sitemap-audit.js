import https from 'https';
import http from 'http';
import { parseString } from 'xml2js';
import fs from 'fs';

const SITE_URL = 'https://free-government-phone.org';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

// Colors for terminal output
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
    const client = url.startsWith('https') ? https : http;
    const startTime = Date.now();
    
    const req = client.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SitemapAudit/1.0)',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime,
          url: res.responseUrl || url,
        });
      });
    });
    
    req.on('error', (err) => {
      reject({ error: err.message, url });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject({ error: 'Request timeout', url });
    });
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

async function auditSitemap() {
  const report = {
    timestamp: new Date().toISOString(),
    sitemapUrl: SITEMAP_URL,
    totalUrls: 0,
    validUrls: 0,
    invalidUrls: 0,
    errors: [],
    warnings: [],
    urlDetails: [],
    cityPages: [],
    statePages: [],
    staticPages: [],
  };

  log('\n🔍 Starting Sitemap Audit...', 'cyan');
  log(`📋 Sitemap URL: ${SITEMAP_URL}\n`, 'blue');

  // Step 1: Fetch and parse sitemap
  try {
    log('📥 Fetching sitemap...', 'yellow');
    const sitemapResponse = await fetchURL(SITEMAP_URL);
    
    if (sitemapResponse.status !== 200) {
      report.errors.push(`Sitemap returned status ${sitemapResponse.status}`);
      log(`❌ Sitemap returned status ${sitemapResponse.status}`, 'red');
      return report;
    }

    // Check content type
    const contentType = sitemapResponse.headers['content-type'] || '';
    if (!contentType.includes('xml') && !contentType.includes('text')) {
      report.warnings.push(`Unexpected content-type: ${contentType}`);
      log(`⚠️  Unexpected content-type: ${contentType}`, 'yellow');
    }

    log('✅ Sitemap fetched successfully', 'green');
    log(`📊 Sitemap size: ${(sitemapResponse.body.length / 1024).toFixed(2)} KB\n`, 'blue');

    // Parse XML
    log('🔨 Parsing XML...', 'yellow');
    const parsed = await parseXML(sitemapResponse.body);
    
    if (!parsed.urlset || !parsed.urlset.url) {
      report.errors.push('Invalid sitemap structure - no urlset.url found');
      log('❌ Invalid sitemap structure', 'red');
      return report;
    }

    const urls = Array.isArray(parsed.urlset.url) 
      ? parsed.urlset.url 
      : [parsed.urlset.url];

    report.totalUrls = urls.length;
    log(`✅ Found ${urls.length} URLs in sitemap\n`, 'green');

    // Extract URLs
    const urlList = urls.map((urlObj) => {
      const loc = urlObj.loc[0];
      const lastmod = urlObj.lastmod ? urlObj.lastmod[0] : null;
      const changefreq = urlObj.changefreq ? urlObj.changefreq[0] : null;
      const priority = urlObj.priority ? urlObj.priority[0] : null;
      
      return { loc, lastmod, changefreq, priority };
    });

    // Categorize URLs
    urlList.forEach((url) => {
      const path = new URL(url.loc).pathname;
      if (path.match(/^\/[a-z]{2}\/[^\/]+\/$/)) {
        report.cityPages.push(url);
      } else if (path.match(/^\/[a-z]{2}\/$/)) {
        report.statePages.push(url);
      } else {
        report.staticPages.push(url);
      }
    });

    log(`📄 Static pages: ${report.staticPages.length}`, 'blue');
    log(`🗺️  State pages: ${report.statePages.length}`, 'blue');
    log(`🏙️  City pages: ${report.cityPages.length}\n`, 'blue');

    // Step 2: Validate sitemap structure
    log('🔍 Validating sitemap structure...', 'yellow');
    const structureIssues = [];
    
    // Check for required fields
    urlList.forEach((url, index) => {
      if (!url.loc) {
        structureIssues.push(`URL ${index + 1}: Missing <loc> tag`);
      }
      if (!url.lastmod) {
        structureIssues.push(`URL ${index + 1}: Missing <lastmod> tag`);
      }
    });

    if (structureIssues.length > 0) {
      report.warnings.push(...structureIssues);
      log(`⚠️  Found ${structureIssues.length} structure issues`, 'yellow');
    } else {
      log('✅ Sitemap structure is valid', 'green');
    }

    // Step 3: Test URLs (sample + all static pages)
    log('\n🧪 Testing URLs...', 'cyan');
    
    const urlsToTest = [
      ...report.staticPages,
      ...report.statePages.slice(0, 5), // Test first 5 states
      ...report.cityPages.slice(0, 10), // Test first 10 cities
    ];

    log(`Testing ${urlsToTest.length} URLs (all static + sample of states/cities)...\n`, 'blue');

    for (let i = 0; i < urlsToTest.length; i++) {
      const url = urlsToTest[i];
      const progress = `[${i + 1}/${urlsToTest.length}]`;
      
      try {
        process.stdout.write(`${progress} Testing ${url.loc}... `);
        const response = await fetchURL(url.loc);
        
        const detail = {
          url: url.loc,
          status: response.status,
          responseTime: response.responseTime,
          valid: response.status >= 200 && response.status < 400,
          redirect: response.status >= 300 && response.status < 400,
        };

        if (detail.valid) {
          report.validUrls++;
          if (detail.redirect) {
            log(`✅ ${response.status} (redirect)`, 'yellow');
            detail.redirectLocation = response.headers.location;
          } else {
            log(`✅ ${response.status}`, 'green');
          }
        } else {
          report.invalidUrls++;
          log(`❌ ${response.status}`, 'red');
          report.errors.push(`URL returned ${response.status}: ${url.loc}`);
        }

        report.urlDetails.push(detail);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        report.invalidUrls++;
        log(`❌ Error: ${error.error}`, 'red');
        report.errors.push(`Failed to fetch ${url.loc}: ${error.error}`);
        report.urlDetails.push({
          url: url.loc,
          status: 'ERROR',
          error: error.error,
          valid: false,
        });
      }
    }

    // Step 4: Test specific city pages (more detailed)
    log('\n🏙️  Testing city pages in detail...', 'cyan');
    const citySamples = report.cityPages.slice(0, 5);
    
    for (const city of citySamples) {
      try {
        log(`  Testing city page: ${city.loc}`, 'blue');
        const response = await fetchURL(city.loc);
        
        if (response.status === 200) {
          // Check if page has content
          const hasContent = response.body.length > 1000;
          const hasTitle = response.body.includes('<title>');
          const hasH1 = response.body.includes('<h1');
          
          if (!hasContent) {
            report.warnings.push(`City page may have low content: ${city.loc}`);
          }
          if (!hasTitle) {
            report.warnings.push(`City page missing title tag: ${city.loc}`);
          }
          if (!hasH1) {
            report.warnings.push(`City page missing H1 tag: ${city.loc}`);
          }
          
          log(`    ✅ Status: ${response.status}, Content: ${hasContent ? 'Yes' : 'Low'}, Title: ${hasTitle ? 'Yes' : 'No'}, H1: ${hasH1 ? 'Yes' : 'No'}`, 'green');
        } else {
          log(`    ❌ Status: ${response.status}`, 'red');
        }
      } catch (error) {
        log(`    ❌ Error: ${error.error}`, 'red');
      }
    }

  } catch (error) {
    report.errors.push(`Failed to fetch sitemap: ${error.message || error.error}`);
    log(`❌ Error: ${error.message || error.error}`, 'red');
  }

  return report;
}

// Run audit
auditSitemap()
  .then((report) => {
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 AUDIT REPORT', 'cyan');
    log('='.repeat(60), 'cyan');
    
    log(`\n✅ Total URLs: ${report.totalUrls}`, 'blue');
    log(`✅ Valid URLs: ${report.validUrls}`, 'green');
    log(`❌ Invalid URLs: ${report.invalidUrls}`, report.invalidUrls > 0 ? 'red' : 'green');
    log(`⚠️  Warnings: ${report.warnings.length}`, report.warnings.length > 0 ? 'yellow' : 'green');
    log(`❌ Errors: ${report.errors.length}`, report.errors.length > 0 ? 'red' : 'green');
    
    log(`\n📄 Static Pages: ${report.staticPages.length}`, 'blue');
    log(`🗺️  State Pages: ${report.statePages.length}`, 'blue');
    log(`🏙️  City Pages: ${report.cityPages.length}`, 'blue');
    
    if (report.errors.length > 0) {
      log('\n❌ ERRORS:', 'red');
      report.errors.forEach((error) => log(`  - ${error}`, 'red'));
    }
    
    if (report.warnings.length > 0) {
      log('\n⚠️  WARNINGS:', 'yellow');
      report.warnings.slice(0, 20).forEach((warning) => log(`  - ${warning}`, 'yellow'));
      if (report.warnings.length > 20) {
        log(`  ... and ${report.warnings.length - 20} more warnings`, 'yellow');
      }
    }
    
    // Save detailed report to file
    const reportFile = 'sitemap-audit-report.json';
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    log(`\n💾 Detailed report saved to: ${reportFile}`, 'green');
    
    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    if (report.errors.length === 0 && report.invalidUrls === 0) {
      log('✅ SITEMAP IS READY FOR GOOGLE SEARCH CONSOLE', 'green');
    } else {
      log('⚠️  SITEMAP HAS ISSUES THAT NEED ATTENTION', 'yellow');
    }
    log('='.repeat(60) + '\n', 'cyan');
    
    process.exit(report.errors.length > 0 || report.invalidUrls > 0 ? 1 : 0);
  })
  .catch((error) => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
