import { supabase } from './supabase';
import { getSiteURL, useSubdomains, getCitySubdomainURL } from './site-config';
import { createCitySlug } from './slug-utils.js';

const URLS_PER_SITEMAP = 10000;

// Cache for deduplicated cities to avoid refetching
let cachedCities: Array<{ name: string; state_abbr: string }> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 3600000; // 1 hour cache

async function fetchAllDeduplicatedCities(): Promise<Array<{ name: string; state_abbr: string }>> {
  // Return cached data if available and fresh
  const now = Date.now();
  if (cachedCities && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedCities;
  }

  const useSubdomainMode = useSubdomains();
  const SITE_URL = getSiteURL();
  const cityUrls = new Set<string>();
  const deduplicatedCities: Array<{ name: string; state_abbr: string }> = [];
  
  if (!supabase) {
    return deduplicatedCities;
  }

  try {
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;
    
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
        for (const city of data) {
          const cityName = city.name;
          const stateAbbr = city.states?.abbreviation || '';
          
          if (!cityName || !stateAbbr) continue;
          
          const citySlug = createCitySlug(cityName);
          const cityUrl = useSubdomainMode 
            ? getCitySubdomainURL(citySlug, stateAbbr.toLowerCase())
            : `${SITE_URL}/${stateAbbr.toLowerCase()}/${citySlug}/`;
          
          if (!cityUrls.has(cityUrl)) {
            cityUrls.add(cityUrl);
            deduplicatedCities.push({ name: cityName, state_abbr: stateAbbr });
          }
        }
        
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    // Cache the result
    cachedCities = deduplicatedCities;
    cacheTimestamp = now;
    console.log(`[Sitemap] Cached ${deduplicatedCities.length} deduplicated cities`);
  } catch (e) {
    console.error('[Sitemap] Error fetching cities:', e);
  }

  return deduplicatedCities;
}

export async function getCitiesForSitemap(offset: number, limit: number): Promise<Array<{ name: string; state_abbr: string }>> {
  // Optimized: Fetch only the cities needed for this specific chunk
  // This is much faster than fetching all cities and slicing
  const useSubdomainMode = useSubdomains();
  const SITE_URL = getSiteURL();
  const cityUrls = new Set<string>();
  const deduplicatedCities: Array<{ name: string; state_abbr: string }> = [];
  
  if (!supabase) {
    return deduplicatedCities;
  }

  try {
    const pageSize = 1000; // Supabase page size
    let currentOffset = 0;
    let page = 0;
    const targetEnd = offset + limit;
    
    // Fetch cities in pages until we have enough unique cities for this chunk
    while (deduplicatedCities.length < limit && currentOffset < targetEnd + pageSize) {
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
        for (const city of data) {
          const cityName = city.name;
          const stateAbbr = city.states?.abbreviation || '';
          
          if (!cityName || !stateAbbr) continue;
          
          const citySlug = createCitySlug(cityName);
          const cityUrl = useSubdomainMode 
            ? getCitySubdomainURL(citySlug, stateAbbr.toLowerCase())
            : `${SITE_URL}/${stateAbbr.toLowerCase()}/${citySlug}/`;
          
          // Only add if URL is unique
          if (!cityUrls.has(cityUrl)) {
            cityUrls.add(cityUrl);
            deduplicatedCities.push({ name: cityName, state_abbr: stateAbbr });
            
            // Stop if we have enough cities for this chunk
            if (deduplicatedCities.length >= targetEnd) {
              break;
            }
          }
        }
        
        if (data.length < pageSize) {
          break; // No more data
        }
        page++;
        currentOffset += data.length;
      } else {
        break; // No more data
      }
    }

    // Return only the slice needed for this sitemap chunk
    const cities = deduplicatedCities.slice(offset, offset + limit);
    
    console.log(`[Sitemap] Chunk: ${cities.length} cities (offset: ${offset}, limit: ${limit}, fetched pages: ${page + 1})`);
    
    return cities;
  } catch (e) {
    console.error('[Sitemap] Error fetching cities:', e);
    return [];
  }
}

export function generateCitySitemapXML(cities: Array<{ name: string; state_abbr: string }>): string {
  const SITE_URL = getSiteURL();
  const today = new Date().toISOString().split('T')[0];
  const useSubdomainMode = useSubdomains();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Add city pages - match reference site: changefreq=weekly, priority=0.8
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
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  xml += `</urlset>`;
  return xml;
}
