// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://ctbusinessautomations.com',
  output: 'static',
  build: {
    format: 'directory'
  },
  integrations: [
    sitemap({
      // Optional: customize sitemap generation
      customPages: [],
      // Exclude thank-you page from sitemap
      filter: (page) => !page.includes('/thank-you')
    })
  ]
});