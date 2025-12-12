import https from 'https';
import { parseString } from 'xml2js';
import fs from 'fs';

const SITE_URL = 'https://free-government-phone.org';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const ROBOTS_URL = `${SITE_URL}/robots.txt`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    https.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapAudit/1.0)' },
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

async function comprehensiveAudit() {
  const report = {
    timestamp: new Date().toISOString(),
    siteUrl: SITE_URL,
    sitemapUrl: SITEMAP_URL,
    robotsUrl: ROBOTS_URL,
    checks: {
      sitemapAccessible: false,
      sitemapFormat: false,
      sitemapSize: false,
      robotsTxtExists: false,
      robotsTxtReferencesSitemap: false,
      noDuplicates: false,
      urlStructure: false,
      cityPagesWorking: false,
      statePagesWorking: false,
      staticPagesWorking: false,
    },
    stats: {
      totalUrls: 0,
      staticPages: 0,
      statePages: 0,
      cityPages: 0,
      duplicates: 0,
      testedUrls: 0,
      validUrls: 0,
      invalidUrls: 0,
    },
    issues: [],
    warnings: [],
    recommendations: [],
  };

  log('\n' + '='.repeat(70), 'cyan');
  log('🔍 COMPREHENSIVE SITEMAP AUDIT FOR GOOGLE SEARCH CONSOLE', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  // 1. Check Sitemap Accessibility
  log('📋 CHECK 1: Sitemap Accessibility', 'magenta');
  try {
    const sitemapResponse = await fetchURL(SITEMAP_URL);
    if (sitemapResponse.status === 200) {
      report.checks.sitemapAccessible = true;
      log('  ✅ Sitemap is accessible (HTTP 200)', 'green');
      
      // Check content type
      const contentType = sitemapResponse.headers['content-type'] || '';
      if (contentType.includes('xml')) {
        report.checks.sitemapFormat = true;
        log('  ✅ Correct Content-Type: ' + contentType, 'green');
      } else {
        report.warnings.push(`Content-Type is "${contentType}" (expected application/xml)`);
        log('  ⚠️  Content-Type: ' + contentType, 'yellow');
      }
      
      // Check size
      const sizeMB = sitemapResponse.body.length / (1024 * 1024);
      report.stats.sitemapSizeMB = sizeMB.toFixed(2);
      if (sizeMB < 50) {
        report.checks.sitemapSize = true;
        log(`  ✅ Sitemap size: ${sizeMB.toFixed(2)}MB (under 50MB limit)`, 'green');
      } else {
        report.issues.push(`Sitemap exceeds 50MB limit: ${sizeMB.toFixed(2)}MB`);
        log(`  ❌ Sitemap size: ${sizeMB.toFixed(2)}MB (exceeds 50MB limit)`, 'red');
      }
      
      // Parse XML
      const parsed = await parseXML(sitemapResponse.body);
      if (parsed.urlset && parsed.urlset.url) {
        const urls = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];
        report.stats.totalUrls = urls.length;
        
        if (urls.length <= 50000) {
          log(`  ✅ URL count: ${urls.length} (under 50,000 limit)`, 'green');
        } else {
          report.issues.push(`Sitemap exceeds 50,000 URL limit: ${urls.length}`);
          log(`  ❌ URL count: ${urls.length} (exceeds 50,000 limit)`, 'red');
        }
        
        // Categorize URLs
        const urlList = urls.map((u) => {
          const loc = u.loc[0];
          const path = new URL(loc).pathname;
          return { loc, path };
        });
        
        urlList.forEach(({ path }) => {
          if (/^\/[a-z]{2}\/[^\/]+\/$/.test(path)) {
            report.stats.cityPages++;
          } else if (/^\/[a-z]{2}\/$/.test(path)) {
            report.stats.statePages++;
          } else {
            report.stats.staticPages++;
          }
        });
        
        // Check for duplicates
        const urlSet = new Set();
        const duplicates = [];
        urlList.forEach(({ loc }, index) => {
          if (urlSet.has(loc)) {
            duplicates.push({ index: index + 1, url: loc });
          }
          urlSet.add(loc);
        });
        
        report.stats.duplicates = duplicates.length;
        if (duplicates.length === 0) {
          report.checks.noDuplicates = true;
          log('  ✅ No duplicate URLs found', 'green');
        } else {
          report.issues.push(`Found ${duplicates.length} duplicate URLs`);
          log(`  ❌ Found ${duplicates.length} duplicate URLs`, 'red');
          duplicates.slice(0, 5).forEach(dup => {
            log(`     - Index ${dup.index}: ${dup.url}`, 'red');
          });
        }
        
        // Validate URL structure
        let urlStructureIssues = 0;
        const sampleUrls = urlList.slice(0, 100);
        sampleUrls.forEach(({ loc }) => {
          try {
            const url = new URL(loc);
            if (url.origin !== SITE_URL) {
              urlStructureIssues++;
            }
            if (!loc.endsWith('/')) {
              urlStructureIssues++;
            }
          } catch (e) {
            urlStructureIssues++;
          }
        });
        
        if (urlStructureIssues === 0) {
          report.checks.urlStructure = true;
          log('  ✅ URL structure is valid', 'green');
        } else {
          report.warnings.push(`Found ${urlStructureIssues} URL structure issues in sample`);
          log(`  ⚠️  Found ${urlStructureIssues} URL structure issues`, 'yellow');
        }
        
        // Test sample URLs
        log('\n📋 CHECK 2: Testing Sample URLs', 'magenta');
        const testUrls = [
          ...urlList.filter(u => report.stats.staticPages > 0 && !u.path.match(/^\/[a-z]{2}/)).slice(0, 5),
          ...urlList.filter(u => /^\/[a-z]{2}\/$/.test(u.path)).slice(0, 3),
          ...urlList.filter(u => /^\/[a-z]{2}\/[^\/]+\/$/.test(u.path)).slice(0, 10),
        ];
        
        for (const { loc } of testUrls) {
          try {
            report.stats.testedUrls++;
            const response = await fetchURL(loc);
            if (response.status >= 200 && response.status < 400) {
              report.stats.validUrls++;
            } else {
              report.stats.invalidUrls++;
              report.issues.push(`URL returned ${response.status}: ${loc}`);
            }
            await new Promise(r => setTimeout(r, 100));
          } catch (error) {
            report.stats.invalidUrls++;
            report.issues.push(`Failed to fetch ${loc}: ${error.message}`);
          }
        }
        
        if (report.stats.invalidUrls === 0) {
          report.checks.staticPagesWorking = true;
          report.checks.statePagesWorking = true;
          report.checks.cityPagesWorking = true;
          log(`  ✅ Tested ${report.stats.testedUrls} URLs - all valid`, 'green');
        } else {
          log(`  ⚠️  Tested ${report.stats.testedUrls} URLs - ${report.stats.invalidUrls} failed`, 'yellow');
        }
        
      } else {
        report.issues.push('Invalid sitemap XML structure');
        log('  ❌ Invalid XML structure', 'red');
      }
    } else {
      report.issues.push(`Sitemap returned HTTP ${sitemapResponse.status}`);
      log(`  ❌ Sitemap returned HTTP ${sitemapResponse.status}`, 'red');
    }
  } catch (error) {
    report.issues.push(`Failed to fetch sitemap: ${error.message}`);
    log(`  ❌ Error: ${error.message}`, 'red');
  }

  // 2. Check robots.txt
  log('\n📋 CHECK 3: Robots.txt', 'magenta');
  try {
    const robotsResponse = await fetchURL(ROBOTS_URL);
    if (robotsResponse.status === 200) {
      report.checks.robotsTxtExists = true;
      log('  ✅ Robots.txt is accessible', 'green');
      
      if (robotsResponse.body.includes('sitemap.xml') || robotsResponse.body.includes('Sitemap:')) {
        report.checks.robotsTxtReferencesSitemap = true;
        log('  ✅ Robots.txt references sitemap', 'green');
      } else {
        report.warnings.push('Robots.txt does not reference sitemap');
        log('  ⚠️  Robots.txt does not reference sitemap', 'yellow');
      }
    } else {
      report.warnings.push(`Robots.txt returned HTTP ${robotsResponse.status}`);
      log(`  ⚠️  Robots.txt returned HTTP ${robotsResponse.status}`, 'yellow');
    }
  } catch (error) {
    report.warnings.push(`Failed to fetch robots.txt: ${error.message}`);
    log(`  ⚠️  Error fetching robots.txt: ${error.message}`, 'yellow');
  }

  // Generate recommendations
  if (report.stats.totalUrls > 10000) {
    report.recommendations.push('Consider splitting sitemap into multiple sitemaps if it grows beyond 50,000 URLs');
  }
  if (!report.checks.robotsTxtReferencesSitemap) {
    report.recommendations.push('Add sitemap reference to robots.txt');
  }
  if (report.stats.duplicates > 0) {
    report.recommendations.push('Fix duplicate URLs in sitemap generation code');
  }

  return report;
}

// Run audit
comprehensiveAudit()
  .then((report) => {
    log('\n' + '='.repeat(70), 'cyan');
    log('📊 FINAL AUDIT REPORT', 'cyan');
    log('='.repeat(70), 'cyan');
    
    log('\n✅ PASSED CHECKS:', 'green');
    Object.entries(report.checks).forEach(([check, passed]) => {
      if (passed) {
        log(`  ✅ ${check.replace(/([A-Z])/g, ' $1').trim()}`, 'green');
      }
    });
    
    log('\n📊 STATISTICS:', 'blue');
    log(`  Total URLs: ${report.stats.totalUrls}`, 'blue');
    log(`  Static Pages: ${report.stats.staticPages}`, 'blue');
    log(`  State Pages: ${report.stats.statePages}`, 'blue');
    log(`  City Pages: ${report.stats.cityPages}`, 'blue');
    log(`  Duplicates: ${report.stats.duplicates}`, report.stats.duplicates > 0 ? 'red' : 'green');
    log(`  Tested URLs: ${report.stats.testedUrls}`, 'blue');
    log(`  Valid URLs: ${report.stats.validUrls}`, 'green');
    log(`  Invalid URLs: ${report.stats.invalidUrls}`, report.stats.invalidUrls > 0 ? 'red' : 'green');
    if (report.stats.sitemapSizeMB) {
      log(`  Sitemap Size: ${report.stats.sitemapSizeMB}MB`, 'blue');
    }
    
    if (report.issues.length > 0) {
      log('\n❌ ISSUES:', 'red');
      report.issues.forEach(issue => log(`  - ${issue}`, 'red'));
    }
    
    if (report.warnings.length > 0) {
      log('\n⚠️  WARNINGS:', 'yellow');
      report.warnings.forEach(warning => log(`  - ${warning}`, 'yellow'));
    }
    
    if (report.recommendations.length > 0) {
      log('\n💡 RECOMMENDATIONS:', 'cyan');
      report.recommendations.forEach(rec => log(`  - ${rec}`, 'cyan'));
    }
    
    // Save report
    const reportFile = 'sitemap-final-audit-report.json';
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    log(`\n💾 Full report saved to: ${reportFile}`, 'green');
    
    // Final verdict
    log('\n' + '='.repeat(70), 'cyan');
    const allCriticalChecks = report.checks.sitemapAccessible && 
                              report.checks.sitemapFormat &&
                              report.checks.noDuplicates &&
                              report.stats.invalidUrls === 0;
    
    if (allCriticalChecks) {
      log('✅ SITEMAP IS READY FOR GOOGLE SEARCH CONSOLE SUBMISSION', 'green');
      log('✅ All critical checks passed', 'green');
    } else {
      log('⚠️  SITEMAP HAS ISSUES - REVIEW BEFORE SUBMITTING', 'yellow');
    }
    log('='.repeat(70) + '\n', 'cyan');
    
    process.exit(allCriticalChecks ? 0 : 1);
  })
  .catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
