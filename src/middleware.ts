// Dynamic middleware that uses site config for domain validation
// Allows Vercel previews and the configured production domain
// For new sites: No redirect logic needed - subdomains are handled via Vercel rewrites
import { getDomain, useSubdomains, parseSubdomain } from './lib/site-config';

export const onRequest = async (context: any, next: any) => {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  
  // Get configured domain from site-config
  const configuredDomain = getDomain();

  // Allow preview hosts (Vercel deployments, localhost)
  const isPreviewHost =
    host.endsWith('.vercel.app') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('localhost');

  // Check if it's the exact configured domain or a subdomain
  const isExactDomain = host === configuredDomain;
  const isWwwDomain = host === `www.${configuredDomain}`;
  const isSubdomain = host.endsWith(`.${configuredDomain}`) && !isWwwDomain;

  // If subdomain mode is enabled, validate subdomain format
  // Vercel rewrites will handle routing subdomains to city pages
  if (useSubdomains() && isSubdomain) {
    const subdomainInfo = parseSubdomain(host);
    // If it's a valid city subdomain, allow it (Vercel rewrites will route it)
    // If it's an invalid subdomain, let the route handler return 404
    if (subdomainInfo) {
      return next();
    }
    // Invalid subdomain - let route handler return 404
  }

  // Allow preview hosts and the configured domain
  if (isPreviewHost || isExactDomain || isSubdomain) {
    // Only redirect www to non-www if we're on the production domain
    if (isWwwDomain && !isPreviewHost) {
      const destination = `https://${configuredDomain}${url.pathname}${url.search}`;
      return context.redirect(destination, 301);
    }
    // Allow the request to proceed
    return next();
  }

  // Only redirect to canonical domain if:
  // 1. We're NOT on a preview host
  // 2. We're NOT already on the configured domain
  // This prevents redirect loops while still enforcing canonical domain
  if (!isPreviewHost && host !== configuredDomain) {
    const destination = `https://${configuredDomain}${url.pathname}${url.search}`;
    if (url.href !== destination) {
      return context.redirect(destination, 301);
    }
  }

  // Default: allow the request
  return next();
};
