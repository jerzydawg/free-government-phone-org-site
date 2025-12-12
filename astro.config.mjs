// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

// https://astro.build/config
// Site URL is set dynamically via SITE_URL env variable or defaults to placeholder
// Use PUBLIC_SITE_URL if available, fallback to SITE_URL, then example.com
const siteURL = process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://free-government-phone.org';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind()],
  site: siteURL,
  server: { port: 4321, host: true },
  build: { inlineStylesheets: 'auto' }
});
