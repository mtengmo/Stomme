import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import packageInfo from './package.json' with { type: 'json' };
import { buildVersion } from './scripts/buildVersion';

const build = buildVersion(packageInfo.version);

/** Content-Security-Policy for the production build only (dev needs inline HMR scripts). */
const CSP =
  "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'";

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(build.version),
    'import.meta.env.VITE_APP_COMMIT': JSON.stringify(build.commit),
  },
  plugins: [
    react(),
    {
      name: 'stomme-csp',
      transformIndexHtml(html, ctx) {
        if (ctx.server) return html;
        return html.replace(
          '<title>',
          `<meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <title>`,
        );
      },
    },
    tailwindcss(),
    // Offline basics (M2.7): precache the build and serve index.html for
    // navigations. Manifest (M6.1); updates wait for the M6 prompt.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Stomme',
        short_name: 'Stomme',
        description: 'Styrkepass för knät, lokalt och offline.',
        lang: 'sv',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#eef3f0',
        background_color: '#eef3f0',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
