import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { forrenderaPlugin } from './vite-plugin-forrendera.ts'
import { granskaPlugin } from './vite-plugin-granska.ts'

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  // Versionen är tiden för bygget, så att en högre siffra är en nyare version (se src/lib/version.ts).
  define: { __APP_VERSION__: JSON.stringify(Date.now()) },
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
        // En ny service worker tar över direkt. Vad sidan gör sedan bestäms i src/lib/pwa.ts och uppdatering.ts.
        registerType: 'autoUpdate',
        // Registreras i src/lib/pwa.ts.
        injectRegister: false,
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
          // Pluginet sätter bara de här själv när det registrerar service workern, och det gör vi i pwa.ts.
          skipWaiting: true,
          clientsClaim: true,
          // Skript och stilar sparas, men av HTML-sidorna bara appskalet (se vite-plugin-forrendera.ts).
          globPatterns: ['**/*.{js,css}', 'app.html'],
          // Sidorna hämtas alltid från nätet, så att man får den senaste versionen. Utan nät visas det sparade appskalet.
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkOnly',
              options: { precacheFallback: { fallbackURL: '/app.html' } },
            },
          ],
        },
      }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
}))
