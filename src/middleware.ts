// Dynamic middleware that uses site config for domain validation
// Allows Vercel previews and the configured production domain
// Note: www -> non-www redirect is handled by vercel.json to prevent loops
import { getDomain } from './lib/site-config';

export const onRequest = async (context: any, next: any) => {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  
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
  const isSubdomain = host.endsWith(`.${configuredDomain}`);

  // Allow preview hosts, exact domain, www domain, and subdomains
  // www -> non-www redirect is handled by vercel.json (runs before middleware)
  if (isPreviewHost || isExactDomain || isWwwDomain || isSubdomain) {
    return next();
  }

  // For any other host that's not related to our domain, allow it
  // (Vercel will handle domain redirects via vercel.json)
  return next();
};
