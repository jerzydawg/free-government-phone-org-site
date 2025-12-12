// Dynamic middleware that uses site config for domain validation
// Allows Vercel previews and the configured production domain
// Handles subdomain routing for city pages
import { getDomain, useSubdomains, parseSubdomain } from './lib/site-config';

export const onRequest = async (context: any, next: any) => {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname;
  
  // Get configured domain from site-config (non-www version)
  const configuredDomain = getDomain();

  // Allow preview hosts (Vercel deployments, localhost) - no redirects for these
  const isPreviewHost =
    host.endsWith('.vercel.app') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('localhost');

  // Check if it's the exact configured domain (non-www) or www version
  const isExactDomain = host === configuredDomain;
  const isWwwDomain = host === `www.${configuredDomain}`;
  const isSubdomain = host.endsWith(`.${configuredDomain}`) && !isWwwDomain;

  // Handle subdomain routing for city pages
  if (useSubdomains() && isSubdomain) {
    const subdomainInfo = parseSubdomain(host);
    if (subdomainInfo) {
      // Rewrite to the city page path internally
      // e.g., wayne-mi.free-government-phone.org/ -> /mi/wayne/
      const { city: citySlug, state: stateAbbr } = subdomainInfo;
      
      // Only rewrite if we're at the root or a simple path
      if (pathname === '/' || pathname === '') {
        // Rewrite the URL to the city page
        const newUrl = new URL(context.request.url);
        newUrl.pathname = `/${stateAbbr}/${citySlug}/`;
        
        // Create a new request with the rewritten URL but keep the original host header
        const newRequest = new Request(newUrl.toString(), {
          method: context.request.method,
          headers: context.request.headers,
          body: context.request.body,
        });
        
        // Update context with new request and continue
        return next(newRequest);
      }
    }
  }

  // Allow preview hosts, exact domain, www domain, and subdomains
  if (isPreviewHost || isExactDomain || isWwwDomain || isSubdomain) {
    return next();
  }

  // For any other host that's not related to our domain, allow it
  return next();
};
