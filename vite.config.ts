import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { forrenderaPlugin } from './vite-plugin-forrendera.ts'
import { granskaPlugin } from './vite-plugin-granska.ts'

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Granskningssidan för Gissa priset. Bara i utvecklingsläge.
    granskaPlugin(),
    // Startsidan och spelsidorna blir färdig HTML i bygget. Bara i produktionsbygget.
    forrenderaPlugin(),
    // Serverdelen som förrenderingen använder (dist-ssr) behöver ingen service worker.
    !isSsrBuild &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'emoji/*.png'],
        manifest: {
          name: 'Kompisduellen',
          short_name: 'Kompisduellen',
          description: 'Bra sällskap. Dåliga förlorare. Partyspel där vänskapen sätts på prov. Skapa en lobby på några sekunder.',
          lang: 'sv',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          // Designens krämvita bakgrund och korallröda huvudfärg.
          background_color: '#fffdf8',
          theme_color: '#e36654',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Appskalet (se vite-plugin-forrendera.ts). index.html är den förrenderade startsidan.
          navigateFallback: '/app.html',
          // robots.txt och sajtkartan ska visas som filer, inte som appen.
          navigateFallbackDenylist: [/^\/(robots\.txt|sitemap\.xml)$/],
        },
      }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
}))
