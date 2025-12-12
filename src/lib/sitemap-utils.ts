import { supabase } from './supabase';
import { getSiteURL, useSubdomains, getCitySubdomainURL } from './site-config';
import { createCitySlug } from './slug-utils.js';

const URLS_PER_SITEMAP = 10000;

export async function getCitiesForSitemap(offset: number, limit: number): Promise<Array<{ name: string; state_abbr: string }>> {
  let cities: Array<{ name: string; state_abbr: string }> = [];
  
  if (!supabase) {
    return cities;
  }

  try {
    // Fetch all cities first (we need to paginate through Supabase's 1000 limit)
    const pageSize = 1000;
    let hasMore = true;
    let page = 0;
    let allCities: Array<{ name: string; state_abbr: string }> = [];
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('cities')
        .select('name, states(abbreviation)')
        .order('population', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        console.error(`[Sitemap] Error fetching cities page ${page}:`, error);
        break;
      }
      
      if (data && data.length > 0) {
        const pageCities = data.map((city: any) => ({
          name: city.name,
          state_abbr: city.states?.abbreviation || ''
        })).filter((c: any) => c.state_abbr && c.name);
        
        allCities.push(...pageCities);
        
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    // Deduplicate cities by URL
    const cityUrls = new Set<string>();
    const useSubdomainMode = useSubdomains();
    const SITE_URL = getSiteURL();
    const deduplicatedCities: Array<{ name: string; state_abbr: string }> = [];
    
    for (const city of allCities) {
      const citySlug = createCitySlug(city.name);
      const cityUrl = useSubdomainMode 
        ? getCitySubdomainURL(citySlug, city.state_abbr.toLowerCase())
        : `${SITE_URL}/${city.state_abbr.toLowerCase()}/${citySlug}/`;
      
      if (!cityUrls.has(cityUrl)) {
        cityUrls.add(cityUrl);
        deduplicatedCities.push(city);
      }
    }

    // Get the slice for this sitemap
    cities = deduplicatedCities.slice(offset, offset + limit);
    
    console.log(`[Sitemap] Generated chunk with ${cities.length} cities (offset: ${offset}, total: ${deduplicatedCities.length})`);
  } catch (e) {
    console.error('[Sitemap] Error fetching cities:', e);
  }

  return cities;
}

export function generateCitySitemapXML(cities: Array<{ name: string; state_abbr: string }>): string {
  const SITE_URL = getSiteURL();
  const today = new Date().toISOString().split('T')[0];
  const useSubdomainMode = useSubdomains();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Add city pages
  const cityUrls = new Set<string>();
  for (const city of cities) {
    const citySlug = createCitySlug(city.name);
    const cityUrl = useSubdomainMode 
      ? getCitySubdomainURL(citySlug, city.state_abbr.toLowerCase())
      : `${SITE_URL}/${city.state_abbr.toLowerCase()}/${citySlug}/`;
    
    // Skip duplicates
    if (cityUrls.has(cityUrl)) {
      continue;
    }
    cityUrls.add(cityUrl);
    
    xml += `  <url>
    <loc>${cityUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  }

  xml += `</urlset>`;
  return xml;
}

