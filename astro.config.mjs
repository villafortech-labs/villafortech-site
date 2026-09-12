import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.villafortech.com',
  trailingSlash: 'always',
  build: {
    inlineStylesheets: 'always',
  },
  integrations: [
    mdx(),
    sitemap({
      filter(page) {
        const pathname = new URL(page).pathname;
        return ![
          '/es/',
          '/404/',
          '/es/404/',
          '/writing/',
          '/es/writing/',
        ].includes(pathname);
      },
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const isHome = pathname === '/' || pathname === '/en/';
        const englishPath = isHome ? '/en/' : pathname.replace(/^\/es\//, '/');
        const spanishPath = isHome ? '/' : `/es${englishPath}`;
        return {
          ...item,
          links: [
            {
              lang: 'es',
              url: new URL(spanishPath, 'https://www.villafortech.com').href,
            },
            {
              lang: 'en',
              url: new URL(englishPath, 'https://www.villafortech.com').href,
            },
            {
              lang: 'x-default',
              url: new URL(spanishPath, 'https://www.villafortech.com').href,
            },
          ],
        };
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
