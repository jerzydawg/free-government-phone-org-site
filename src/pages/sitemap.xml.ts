import type { APIRoute } from 'astro';
import { getSiteURL } from '../lib/site-config';
import { supabase } from '../lib/supabase';

// Sitemap index - references multiple sitemap files
export const GET: APIRoute = async () => {
  const SITE_URL = getSiteURL();
  const today = new Date().toISOString().split('T')[0];

  // Calculate how many city sitemap files we need
  // Each sitemap file contains max 10,000 URLs
  const URLS_PER_SITEMAP = 10000;
  let citySitemapCount = 5; // Default to 5 files (covers 40k cities)
  
  // Try to get actual city count to calculate needed sitemap files
  if (supabase) {
    try {
      const { count } = await supabase
        .from('cities')
        .select('*', { count: 'exact', head: true });
      
      if (count !== null) {
        // Calculate: (city count / URLs_PER_SITEMAP) rounded up
        citySitemapCount = Math.ceil(count / URLS_PER_SITEMAP);
        // Ensure minimum of 1 and maximum reasonable limit
        citySitemapCount = Math.max(1, Math.min(citySitemapCount, 10));
      }
    } catch (e) {
      console.error('[Sitemap Index] Error getting city count, using default:', e);
    }
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-main.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
`;

  // Add city sitemap files (sitemap-2.xml through sitemap-N.xml)
  for (let i = 2; i <= citySitemapCount + 1; i++) {
    xml += `  <sitemap>
    <loc>${SITE_URL}/sitemap-${i}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
`;
  }

  xml += `</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
