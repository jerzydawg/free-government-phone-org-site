#!/usr/bin/env node
/**
 * Comprehensive Site Audit Script for free-government-phone.org
 * Extracts and validates all links, checks domain consistency, and generates audit report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_ROOT = __dirname;
const SRC_DIR = path.join(SITE_ROOT, 'src');
const PUBLIC_DIR = path.join(SITE_ROOT, 'public');

// Expected domain
const EXPECTED_DOMAIN = 'free-government-phone.org';
const EXPECTED_SITE_URL = `https://${EXPECTED_DOMAIN}`;

// Audit results
const auditResults = {
  links: {
    internal: [],
    external: [],
    broken: [],
    anchor: [],
    stateCity: []
  },
  domainIssues: [],
  contentIssues: [],
  seoIssues: [],
  technicalIssues: [],
  accessibilityIssues: []
};

// Common internal routes
const INTERNAL_ROUTES = [
  '/', '/apply', '/eligibility', '/providers', '/faq', '/contact',
  '/programs', '/lifeline-program', '/acp-program', '/states',
  '/tribal-programs', '/state-programs', '/emergency-broadband',
  '/privacy-policy', '/terms-of-service', '/free-government-phone-near-me'
];

/**
 * Extract all links from a file
 */
function extractLinks(filePath, content) {
  const links = [];
  const fileType = path.extname(filePath);
  
  // Extract href attributes
  const hrefRegex = /href=["']([^"']+)["']/g;
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    const url = match[1];
    if (url && !url.startsWith('javascript:') && !url.startsWith('mailto:')) {
      links.push({
        url,
        file: path.relative(SITE_ROOT, filePath),
        line: (content.substring(0, match.index).match(/\n/g) || []).length + 1
      });
    }
  }
  
  // Extract src attributes (for images, scripts, etc.)
  const srcRegex = /src=["']([^"']+)["']/g;
  while ((match = srcRegex.exec(content)) !== null) {
    const url = match[1];
    if (url && !url.startsWith('data:') && !url.startsWith('javascript:')) {
      links.push({
        url,
        file: path.relative(SITE_ROOT, filePath),
        line: (content.substring(0, match.index).match(/\n/g) || []).length + 1,
        type: 'src'
      });
    }
  }
  
  return links;
}

/**
 * Categorize a link
 */
function categorizeLink(link) {
  const url = link.url;
  
  // Anchor links
  if (url.startsWith('#')) {
    return 'anchor';
  }
  
  // External links
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'external';
  }
  
  // State/city dynamic routes
  if (url.match(/^\/[a-z]{2}\//) || url.match(/^\/[a-z]{2}\/[a-z-]+\//)) {
    return 'stateCity';
  }
  
  // Internal links
  if (url.startsWith('/')) {
    return 'internal';
  }
  
  return 'relative';
}

/**
 * Check domain consistency
 */
function checkDomainConsistency(content, filePath) {
  const issues = [];
  
  // Check for .co domain references
  const coDomainRegex = /government-phone\.co/g;
  let match;
  while ((match = coDomainRegex.exec(content)) !== null) {
    issues.push({
      file: path.relative(SITE_ROOT, filePath),
      line: (content.substring(0, match.index).match(/\n/g) || []).length + 1,
      issue: `Found government-phone.co reference (should be ${EXPECTED_DOMAIN})`,
      context: content.substring(Math.max(0, match.index - 50), match.index + 50)
    });
  }
  
  // Check for hardcoded URLs that should use getSiteURL()
  const hardcodedUrlRegex = /https?:\/\/[^"'\s]+free-government-phone/g;
  while ((match = hardcodedUrlRegex.exec(content)) !== null) {
    if (!match[0].includes('schema.org') && !match[0].includes('fonts.googleapis.com')) {
      issues.push({
        file: path.relative(SITE_ROOT, filePath),
        line: (content.substring(0, match.index).match(/\n/g) || []).length + 1,
        issue: 'Hardcoded URL found (should use getSiteURL() function)',
        context: match[0]
      });
    }
  }
  
  return issues;
}

/**
 * Check SEO elements
 */
function checkSEO(content, filePath) {
  const issues = [];
  const fileName = path.basename(filePath);
  
  // Skip if it's a layout or component (not a page)
  if (filePath.includes('/layouts/') || filePath.includes('/components/')) {
    return issues;
  }
  
  // Check for title tag
  if (!content.includes('<title>') && !content.includes('title=')) {
    issues.push({
      file: path.relative(SITE_ROOT, filePath),
      issue: 'Missing title tag or title prop'
    });
  }
  
  // Check for meta description
  if (!content.includes('meta name="description"') && !content.includes('description=')) {
    issues.push({
      file: path.relative(SITE_ROOT, filePath),
      issue: 'Missing meta description'
    });
  }
  
  // Check for canonical URL
  if (!content.includes('rel="canonical"') && !content.includes('canonicalURL')) {
    issues.push({
      file: path.relative(SITE_ROOT, filePath),
      issue: 'Missing canonical URL'
    });
  }
  
  // Check for H1 tag
  if (!content.includes('<h1') && !content.includes('h1Content')) {
    issues.push({
      file: path.relative(SITE_ROOT, filePath),
      issue: 'Missing H1 tag'
    });
  }
  
  return issues;
}

/**
 * Check accessibility
 */
function checkAccessibility(content, filePath) {
  const issues = [];
  
  // Check for images without alt text
  const imgRegex = /<img[^>]*>/g;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    const imgTag = match[0];
    if (!imgTag.includes('alt=') && !imgTag.includes('alt =')) {
      issues.push({
        file: path.relative(SITE_ROOT, filePath),
        line: (content.substring(0, match.index).match(/\n/g) || []).length + 1,
        issue: 'Image missing alt attribute',
        context: imgTag.substring(0, 100)
      });
    }
  }
  
  // Check for buttons without aria-label or text content
  const buttonRegex = /<button[^>]*>[\s]*<\/button>/g;
  while ((match = buttonRegex.exec(content)) !== null) {
    const buttonTag = match[0];
    if (!buttonTag.includes('aria-label') && !buttonTag.includes('aria-labelledby')) {
      issues.push({
        file: path.relative(SITE_ROOT, filePath),
        line: (content.substring(0, match.index).match(/\n/g) || []).length + 1,
        issue: 'Button missing aria-label or text content',
        context: buttonTag
      });
    }
  }
  
  return issues;
}

/**
 * Main audit function
 */
async function runAudit() {
  console.log('🔍 Starting comprehensive site audit...\n');
  
  // Find all source files
  const astroFiles = await glob('src/**/*.astro', { cwd: SITE_ROOT });
  const tsFiles = await glob('src/**/*.ts', { cwd: SITE_ROOT });
  const tsxFiles = await glob('src/**/*.tsx', { cwd: SITE_ROOT });
  
  const allFiles = [...astroFiles, ...tsFiles, ...tsxFiles].filter(
    f => !f.includes('node_modules') && !f.includes('.astro/')
  );
  
  console.log(`📁 Found ${allFiles.length} files to audit\n`);
  
  // Process each file
  for (const file of allFiles) {
    const filePath = path.join(SITE_ROOT, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract links
    const links = extractLinks(filePath, content);
    links.forEach(link => {
      const category = categorizeLink(link);
      if (category === 'internal') {
        auditResults.links.internal.push(link);
      } else if (category === 'external') {
        auditResults.links.external.push(link);
      } else if (category === 'anchor') {
        auditResults.links.anchor.push(link);
      } else if (category === 'stateCity') {
        auditResults.links.stateCity.push(link);
      }
    });
    
    // Check domain consistency
    const domainIssues = checkDomainConsistency(content, filePath);
    auditResults.domainIssues.push(...domainIssues);
    
    // Check SEO
    const seoIssues = checkSEO(content, filePath);
    auditResults.seoIssues.push(...seoIssues);
    
    // Check accessibility
    const accessibilityIssues = checkAccessibility(content, filePath);
    auditResults.accessibilityIssues.push(...accessibilityIssues);
  }
  
  // Check for robots.txt
  const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    auditResults.technicalIssues.push({
      file: 'public/robots.txt',
      issue: 'robots.txt file is missing'
    });
  }
  
  // Check for sitemap files
  const sitemapFiles = [
    'src/pages/sitemap.xml.ts',
    'src/pages/sitemap-main.xml.ts'
  ];
  
  sitemapFiles.forEach(sitemap => {
    const sitemapPath = path.join(SITE_ROOT, sitemap);
    if (!fs.existsSync(sitemapPath)) {
      auditResults.technicalIssues.push({
        file: sitemap,
        issue: 'Sitemap file is missing'
      });
    }
  });
  
  // Generate report
  generateReport();
}

/**
 * Generate audit report
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    domain: EXPECTED_DOMAIN,
    summary: {
      totalFilesAudited: 0,
      totalLinksFound: auditResults.links.internal.length + 
                      auditResults.links.external.length + 
                      auditResults.links.anchor.length + 
                      auditResults.links.stateCity.length,
      domainIssues: auditResults.domainIssues.length,
      seoIssues: auditResults.seoIssues.length,
      technicalIssues: auditResults.technicalIssues.length,
      accessibilityIssues: auditResults.accessibilityIssues.length
    },
    details: auditResults
  };
  
  // Write JSON report
  const reportPath = path.join(SITE_ROOT, 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generate human-readable report
  generateHumanReadableReport(report);
  
  console.log('\n✅ Audit complete!');
  console.log(`📊 Report saved to: ${reportPath}`);
  console.log(`📄 Human-readable report saved to: ${path.join(SITE_ROOT, 'AUDIT_REPORT.md')}`);
}

/**
 * Generate human-readable markdown report
 */
function generateHumanReadableReport(report) {
  let md = `# Site Audit Report for ${EXPECTED_DOMAIN}\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  md += `---\n\n`;
  
  // Summary
  md += `## Executive Summary\n\n`;
  md += `- **Total Links Found:** ${report.summary.totalLinksFound}\n`;
  md += `  - Internal: ${auditResults.links.internal.length}\n`;
  md += `  - External: ${auditResults.links.external.length}\n`;
  md += `  - Anchor: ${auditResults.links.anchor.length}\n`;
  md += `  - State/City: ${auditResults.links.stateCity.length}\n`;
  md += `- **Domain Issues:** ${report.summary.domainIssues}\n`;
  md += `- **SEO Issues:** ${report.summary.seoIssues}\n`;
  md += `- **Technical Issues:** ${report.summary.technicalIssues}\n`;
  md += `- **Accessibility Issues:** ${report.summary.accessibilityIssues}\n\n`;
  
  // Domain Issues
  if (auditResults.domainIssues.length > 0) {
    md += `## 🔴 Critical: Domain Consistency Issues\n\n`;
    auditResults.domainIssues.forEach(issue => {
      md += `### ${issue.file}\n`;
      md += `- **Line ${issue.line}:** ${issue.issue}\n`;
      md += `- **Context:** \`${issue.context}\`\n\n`;
    });
  } else {
    md += `## ✅ Domain Consistency: PASS\n\n`;
    md += `All domain references are correct.\n\n`;
  }
  
  // SEO Issues
  if (auditResults.seoIssues.length > 0) {
    md += `## ⚠️ SEO Issues\n\n`;
    const groupedByFile = {};
    auditResults.seoIssues.forEach(issue => {
      if (!groupedByFile[issue.file]) {
        groupedByFile[issue.file] = [];
      }
      groupedByFile[issue.file].push(issue);
    });
    
    Object.entries(groupedByFile).forEach(([file, issues]) => {
      md += `### ${file}\n`;
      issues.forEach(issue => {
        md += `- ${issue.issue}\n`;
      });
      md += `\n`;
    });
  } else {
    md += `## ✅ SEO: PASS\n\n`;
    md += `All pages have proper SEO elements.\n\n`;
  }
  
  // Technical Issues
  if (auditResults.technicalIssues.length > 0) {
    md += `## ⚠️ Technical Issues\n\n`;
    auditResults.technicalIssues.forEach(issue => {
      md += `### ${issue.file}\n`;
      md += `- ${issue.issue}\n\n`;
    });
  } else {
    md += `## ✅ Technical: PASS\n\n`;
    md += `No technical issues found.\n\n`;
  }
  
  // Accessibility Issues
  if (auditResults.accessibilityIssues.length > 0) {
    md += `## ⚠️ Accessibility Issues\n\n`;
    const groupedByFile = {};
    auditResults.accessibilityIssues.forEach(issue => {
      if (!groupedByFile[issue.file]) {
        groupedByFile[issue.file] = [];
      }
      groupedByFile[issue.file].push(issue);
    });
    
    Object.entries(groupedByFile).forEach(([file, issues]) => {
      md += `### ${file}\n`;
      issues.forEach(issue => {
        md += `- **Line ${issue.line}:** ${issue.issue}\n`;
        if (issue.context) {
          md += `  - Context: \`${issue.context}\`\n`;
        }
      });
      md += `\n`;
    });
  } else {
    md += `## ✅ Accessibility: PASS\n\n`;
    md += `No accessibility issues found.\n\n`;
  }
  
  // Link Summary
  md += `## Link Summary\n\n`;
  md += `### Internal Links (${auditResults.links.internal.length})\n`;
  const internalUrls = [...new Set(auditResults.links.internal.map(l => l.url))];
  internalUrls.slice(0, 20).forEach(url => {
    md += `- ${url}\n`;
  });
  if (internalUrls.length > 20) {
    md += `- ... and ${internalUrls.length - 20} more\n`;
  }
  md += `\n`;
  
  md += `### External Links (${auditResults.links.external.length})\n`;
  const externalUrls = [...new Set(auditResults.links.external.map(l => l.url))];
  externalUrls.forEach(url => {
    md += `- ${url}\n`;
  });
  md += `\n`;
  
  // Priority Fix List
  md += `## Priority Fix List\n\n`;
  md += `1. **CRITICAL:** Fix any domain consistency issues\n`;
  md += `2. **HIGH:** Resolve SEO issues (missing meta tags, titles, etc.)\n`;
  md += `3. **MEDIUM:** Fix accessibility issues (alt text, ARIA labels)\n`;
  md += `4. **LOW:** Review and optimize link structure\n\n`;
  
  const reportPath = path.join(SITE_ROOT, 'AUDIT_REPORT.md');
  fs.writeFileSync(reportPath, md);
}

// Run audit
runAudit().catch(console.error);




