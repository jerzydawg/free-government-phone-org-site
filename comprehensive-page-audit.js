import https from 'https';
import { parseString } from 'xml2js';
import fs from 'fs';
import crypto from 'crypto';

const SITES = [
  {
    name: 'free-government-phone.org',
    url: 'https://free-government-phone.org',
    sitemap: 'https://free-government-phone.org/sitemap.xml'
  },
  {
    name: 'government-phone.co',
    url: 'https://government-phone.co',
    sitemap: 'https://government-phone.co/sitemap.xml'
  }
];

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
      timeout: 20000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; PageAudit/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: Date.now() - startTime,
          url: res.responseUrl || url,
        });
      });
    }).on('error', reject).on('timeout', function() { 
      this.destroy(); 
      reject(new Error('Timeout')); 
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

function extractTextContent(html) {
  // Remove scripts, styles, and other non-content elements
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function extractMainContent(html) {
  // Try to extract main content area
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || 
                    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                    html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  
  if (mainMatch) {
    return extractTextContent(mainMatch[1]);
  }
  return extractTextContent(html);
}

function calculateContentHash(content) {
  // Normalize content for comparison
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .substring(0, 5000); // First 5000 chars for comparison
  
  return crypto.createHash('md5').update(normalized).digest('hex');
}

function extractSEOData(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  
  return {
    title: titleMatch ? titleMatch[1].trim() : null,
    metaDescription: metaDescMatch ? metaDescMatch[1].trim() : null,
    h1: h1Match ? extractTextContent(h1Match[1]).trim() : null,
  };
}

async function getAllSitemapURLs(sitemapUrl) {
  try {
    const response = await fetchURL(sitemapUrl);
    if (response.status !== 200) {
      throw new Error(`Sitemap returned ${response.status}`);
    }
    
    const parsed = await parseXML(response.body);
    const urls = [];
    
    // Check if it's a sitemap index
    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      const sitemaps = Array.isArray(parsed.sitemapindex.sitemap) 
        ? parsed.sitemapindex.sitemap 
        : [parsed.sitemapindex.sitemap];
      
      log(`  Found sitemap index with ${sitemaps.length} sitemaps`, 'blue');
      
      // Fetch all sitemaps
      for (const sitemap of sitemaps) {
        const sitemapLoc = sitemap.loc[0];
        log(`  Fetching ${sitemapLoc}...`, 'yellow');
        try {
          const subResponse = await fetchURL(sitemapLoc);
          const subParsed = await parseXML(subResponse.body);
          
          if (subParsed.urlset && subParsed.urlset.url) {
            const subUrls = Array.isArray(subParsed.urlset.url) 
              ? subParsed.urlset.url 
              : [subParsed.urlset.url];
            subUrls.forEach(u => urls.push(u.loc[0]));
          }
        } catch (e) {
          log(`  ⚠️  Error fetching ${sitemapLoc}: ${e.message}`, 'yellow');
        }
      }
    } else if (parsed.urlset && parsed.urlset.url) {
      const urlList = Array.isArray(parsed.urlset.url) 
        ? parsed.urlset.url 
        : [parsed.urlset.url];
      urlList.forEach(u => urls.push(u.loc[0]));
    }
    
    return urls;
  } catch (error) {
    throw error;
  }
}

async function auditPage(url, siteName) {
  try {
    const response = await fetchURL(url);
    
    if (response.status !== 200) {
      return {
        url,
        status: response.status,
        error: `HTTP ${response.status}`,
        valid: false,
      };
    }
    
    const html = response.body;
    const mainContent = extractMainContent(html);
    const contentHash = calculateContentHash(mainContent);
    const seoData = extractSEOData(html);
    const contentLength = mainContent.length;
    const wordCount = mainContent.split(/\s+/).filter(w => w.length > 0).length;
    
    // Check for thin content
    const isThinContent = contentLength < 300 || wordCount < 50;
    
    // Extract key elements
    const hasTitle = !!seoData.title;
    const hasMetaDesc = !!seoData.metaDescription;
    const hasH1 = !!seoData.h1;
    
    return {
      url,
      status: response.status,
      valid: true,
      contentHash,
      contentLength,
      wordCount,
      isThinContent,
      seoData,
      hasTitle,
      hasMetaDesc,
      hasH1,
      responseTime: response.responseTime,
    };
  } catch (error) {
    return {
      url,
      status: 'ERROR',
      error: error.message,
      valid: false,
    };
  }
}

async function comprehensiveAudit() {
  const report = {
    timestamp: new Date().toISOString(),
    sites: {},
    duplicateContent: [],
    thinContent: [],
    missingSEO: [],
    errors: [],
    summary: {},
  };
  
  log('\n' + '='.repeat(80), 'cyan');
  log('🔍 COMPREHENSIVE PAGE AUDIT - DUPLICATE CONTENT DETECTION', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');
  
  // Process each site
  for (const site of SITES) {
    log(`\n📋 Processing Site: ${site.name}`, 'magenta');
    log(`   URL: ${site.url}`, 'blue');
    log(`   Sitemap: ${site.sitemap}\n`, 'blue');
    
    const siteData = {
      name: site.name,
      url: site.url,
      pages: [],
      contentHashes: new Map(),
      stats: {
        total: 0,
        valid: 0,
        invalid: 0,
        thinContent: 0,
        missingTitle: 0,
        missingMetaDesc: 0,
        missingH1: 0,
      },
    };
    
    try {
      // Get all URLs from sitemap
      log('  📥 Fetching sitemap URLs...', 'yellow');
      const urls = await getAllSitemapURLs(site.sitemap);
      log(`  ✅ Found ${urls.length} URLs\n`, 'green');
      
      siteData.stats.total = urls.length;
      
      // Audit pages (sample for now, can be expanded)
      const pagesToAudit = urls.slice(0, 100); // Audit first 100 pages
      log(`  🧪 Auditing ${pagesToAudit.length} pages...\n`, 'yellow');
      
      for (let i = 0; i < pagesToAudit.length; i++) {
        const url = pagesToAudit[i];
        const progress = `[${i + 1}/${pagesToAudit.length}]`;
        process.stdout.write(`  ${progress} ${url.substring(0, 60)}... `);
        
        const pageData = await auditPage(url, site.name);
        siteData.pages.push(pageData);
        
        if (pageData.valid) {
          siteData.stats.valid++;
          
          // Track content hashes for duplicate detection
          if (siteData.contentHashes.has(pageData.contentHash)) {
            const existingUrl = siteData.contentHashes.get(pageData.contentHash);
            report.duplicateContent.push({
              site: site.name,
              url1: existingUrl,
              url2: url,
              contentHash: pageData.contentHash,
            });
          } else {
            siteData.contentHashes.set(pageData.contentHash, url);
          }
          
          // Check for issues
          if (pageData.isThinContent) {
            siteData.stats.thinContent++;
            report.thinContent.push({
              site: site.name,
              url,
              contentLength: pageData.contentLength,
              wordCount: pageData.wordCount,
            });
          }
          
          if (!pageData.hasTitle) {
            siteData.stats.missingTitle++;
            report.missingSEO.push({
              site: site.name,
              url,
              issue: 'Missing title tag',
            });
          }
          
          if (!pageData.hasMetaDesc) {
            siteData.stats.missingMetaDesc++;
            report.missingSEO.push({
              site: site.name,
              url,
              issue: 'Missing meta description',
            });
          }
          
          if (!pageData.hasH1) {
            siteData.stats.missingH1++;
            report.missingSEO.push({
              site: site.name,
              url,
              issue: 'Missing H1 tag',
            });
          }
          
          log('✅', 'green');
        } else {
          siteData.stats.invalid++;
          log(`❌ ${pageData.error || pageData.status}`, 'red');
          report.errors.push({
            site: site.name,
            url,
            error: pageData.error || `HTTP ${pageData.status}`,
          });
        }
        
        // Small delay to avoid overwhelming servers
        await new Promise(r => setTimeout(r, 200));
      }
      
      report.sites[site.name] = siteData;
      
    } catch (error) {
      log(`  ❌ Error processing site: ${error.message}`, 'red');
      report.errors.push({
        site: site.name,
        error: error.message,
      });
    }
  }
  
  // Cross-site duplicate detection
  log('\n🔍 Checking for cross-site duplicate content...', 'cyan');
  const allContentHashes = new Map();
  
  Object.values(report.sites).forEach(siteData => {
    siteData.pages.forEach(page => {
      if (page.valid && page.contentHash) {
        const key = `${siteData.name}:${page.url}`;
        if (allContentHashes.has(page.contentHash)) {
          const existing = allContentHashes.get(page.contentHash);
          report.duplicateContent.push({
            site1: existing.split(':')[0],
            url1: existing.split(':').slice(1).join(':'),
            site2: siteData.name,
            url2: page.url,
            contentHash: page.contentHash,
            crossSite: true,
          });
        } else {
          allContentHashes.set(page.contentHash, key);
        }
      }
    });
  });
  
  // Generate summary
  report.summary = {
    totalSites: SITES.length,
    totalPagesAudited: Object.values(report.sites).reduce((sum, s) => sum + s.stats.total, 0),
    validPages: Object.values(report.sites).reduce((sum, s) => sum + s.stats.valid, 0),
    invalidPages: Object.values(report.sites).reduce((sum, s) => sum + s.stats.invalid, 0),
    duplicateContentIssues: report.duplicateContent.length,
    thinContentIssues: report.thinContent.length,
    missingSEOIssues: report.missingSEO.length,
    errors: report.errors.length,
  };
  
  return report;
}

// Run audit
comprehensiveAudit()
  .then((report) => {
    log('\n' + '='.repeat(80), 'cyan');
    log('📊 COMPREHENSIVE AUDIT REPORT', 'cyan');
    log('='.repeat(80), 'cyan');
    
    log('\n📈 SUMMARY:', 'blue');
    log(`  Sites Audited: ${report.summary.totalSites}`, 'blue');
    log(`  Total Pages: ${report.summary.totalPagesAudited}`, 'blue');
    log(`  Valid Pages: ${report.summary.validPages}`, 'green');
    log(`  Invalid Pages: ${report.summary.invalidPages}`, report.summary.invalidPages > 0 ? 'red' : 'green');
    
    log('\n⚠️  ISSUES FOUND:', 'yellow');
    log(`  Duplicate Content: ${report.summary.duplicateContentIssues}`, 
        report.summary.duplicateContentIssues > 0 ? 'red' : 'green');
    log(`  Thin Content: ${report.summary.thinContentIssues}`, 
        report.summary.thinContentIssues > 0 ? 'yellow' : 'green');
    log(`  Missing SEO Elements: ${report.summary.missingSEOIssues}`, 
        report.summary.missingSEOIssues > 0 ? 'yellow' : 'green');
    log(`  Errors: ${report.summary.errors}`, 
        report.summary.errors > 0 ? 'red' : 'green');
    
    // Site-specific stats
    Object.entries(report.sites).forEach(([siteName, siteData]) => {
      log(`\n📋 ${siteName}:`, 'magenta');
      log(`  Total Pages: ${siteData.stats.total}`, 'blue');
      log(`  Valid: ${siteData.stats.valid}`, 'green');
      log(`  Invalid: ${siteData.stats.invalid}`, siteData.stats.invalid > 0 ? 'red' : 'green');
      log(`  Thin Content: ${siteData.stats.thinContent}`, siteData.stats.thinContent > 0 ? 'yellow' : 'green');
      log(`  Missing Title: ${siteData.stats.missingTitle}`, siteData.stats.missingTitle > 0 ? 'yellow' : 'green');
      log(`  Missing Meta Desc: ${siteData.stats.missingMetaDesc}`, siteData.stats.missingMetaDesc > 0 ? 'yellow' : 'green');
      log(`  Missing H1: ${siteData.stats.missingH1}`, siteData.stats.missingH1 > 0 ? 'yellow' : 'green');
    });
    
    // Show duplicate content issues
    if (report.duplicateContent.length > 0) {
      log('\n❌ DUPLICATE CONTENT DETECTED:', 'red');
      report.duplicateContent.slice(0, 20).forEach(dup => {
        if (dup.crossSite) {
          log(`  Cross-site duplicate:`, 'red');
          log(`    ${dup.site1}: ${dup.url1}`, 'yellow');
          log(`    ${dup.site2}: ${dup.url2}`, 'yellow');
        } else {
          log(`  Same-site duplicate (${dup.site}):`, 'red');
          log(`    ${dup.url1}`, 'yellow');
          log(`    ${dup.url2}`, 'yellow');
        }
      });
      if (report.duplicateContent.length > 20) {
        log(`  ... and ${report.duplicateContent.length - 20} more duplicates`, 'yellow');
      }
    }
    
    // Show thin content
    if (report.thinContent.length > 0) {
      log('\n⚠️  THIN CONTENT PAGES:', 'yellow');
      report.thinContent.slice(0, 10).forEach(page => {
        log(`  ${page.site}: ${page.url}`, 'yellow');
        log(`    Words: ${page.wordCount}, Chars: ${page.contentLength}`, 'yellow');
      });
      if (report.thinContent.length > 10) {
        log(`  ... and ${report.thinContent.length - 10} more`, 'yellow');
      }
    }
    
    // Save report
    const reportFile = 'comprehensive-page-audit-report.json';
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    log(`\n💾 Full report saved to: ${reportFile}`, 'green');
    
    // Final verdict
    log('\n' + '='.repeat(80), 'cyan');
    const hasCriticalIssues = report.summary.duplicateContentIssues > 0 || 
                              report.summary.errors > 0;
    const hasWarnings = report.summary.thinContentIssues > 0 || 
                       report.summary.missingSEOIssues > 0;
    
    if (!hasCriticalIssues && !hasWarnings) {
      log('✅ NO GOOGLE PENALTY RISKS DETECTED', 'green');
      log('✅ All pages are unique and properly optimized', 'green');
    } else if (!hasCriticalIssues) {
      log('⚠️  MINOR ISSUES DETECTED - Review recommendations', 'yellow');
      log('✅ No critical duplicate content issues', 'green');
    } else {
      log('❌ CRITICAL ISSUES FOUND - Action Required', 'red');
      log('⚠️  Duplicate content detected - Google may penalize', 'red');
    }
    log('='.repeat(80) + '\n', 'cyan');
    
    process.exit(hasCriticalIssues ? 1 : 0);
  })
  .catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
