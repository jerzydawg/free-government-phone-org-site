import type { APIRoute } from 'astro';
import { getCitiesForSitemap, generateCitySitemapXML } from '../lib/sitemap-utils';

const URLS_PER_SITEMAP = 10000;

export const GET: APIRoute = async () => {
  const offset = (2 - 2) * URLS_PER_SITEMAP; // sitemap-2 = 0-9999
  const cities = await getCitiesForSitemap(offset, URLS_PER_SITEMAP);
  const xml = generateCitySitemapXML(cities);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

