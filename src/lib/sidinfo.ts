// Det som står i <head> för varje sida: titel, beskrivning, kanonisk adress, Open Graph och strukturerad data
// (JSON-LD). Samma taggar används när sidorna förrenderas i bygget (vite-plugin-forrendera.ts) och när appen byter
// sida i webbläsaren (usePageMeta). Taggarna ligger mellan kommentarerna <!-- sidinfo --> och <!-- /sidinfo -->
// i index.html.

import { findGame } from '@/lib/games'
import { GUIDE_PAGES, type GuideFaq } from '@/lib/guider'
import { GAME_PAGES, type GamePageInfo } from '@/lib/spelsidor'

export const SITE_URL = 'https://kompisduellen.se'
export const SITE_NAME = 'Kompisduellen'

const SITE_DESCRIPTION =
  'Bra sällskap. Dåliga förlorare. Partyspel där vänskapen sätts på prov. Skapa en lobby på några sekunder.'
const SITE_SUMMARY =
  'Partyspel och gissningslekar att köra med kompisar. Skapa en lobby, dela koden och tävla mot varandra på varsin mobil eller dator.'

export type JsonLd = Record<string, unknown>

export type PageMeta = {
  title: string
  description: string
  // Sökvägen som är sidans kanoniska adress. null för sidor som inte ska synas i sökresultaten (lobbyn, profilen …).
  path: string | null
  jsonLd: JsonLd[]
  // Egen bild när sidan delas (Open Graph, 1200 × 630 i public/og). Saknas den visas loggan.
  image?: { path: string; alt: string }
}

const WEBSITE_ID = `${SITE_URL}/#website`

const website: JsonLd = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: SITE_SUMMARY,
  inLanguage: 'sv',
}

const free: JsonLd = { '@type': 'Offer', price: '0', priceCurrency: 'SEK' }

const HOME: PageMeta = {
  title: 'Kompisduellen | Partyspel och gissningslekar med kompisar',
  description: SITE_DESCRIPTION,
  path: '/',
  jsonLd: [
    website,
    {
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: SITE_SUMMARY,
      inLanguage: 'sv',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Alla med webbläsare',
      isAccessibleForFree: true,
      offers: free,
      isPartOf: { '@id': WEBSITE_ID },
    },
  ],
}

// Övriga sidor (lobbyn, profilen, sidor som inte finns): sajtens titel och beskrivning, utan kanonisk adress.
const DEFAULT: PageMeta = { title: SITE_NAME, description: SITE_DESCRIPTION, path: null, jsonLd: [] }

// En spelsida: spelet som VideoGame (gratis, flera spelare, i webbläsaren) och de vanliga frågorna som FAQPage.
function gamePageMeta(page: GamePageInfo): PageMeta {
  const path = `/spel/${page.slug}`
  const game = findGame(page.gameId)
  return {
    title: page.title,
    description: page.description,
    path,
    ...(page.image && { image: page.image }),
    jsonLd: [
      {
        '@type': 'VideoGame',
        name: game?.name ?? page.heading,
        url: `${SITE_URL}${path}`,
        description: page.description,
        inLanguage: 'sv',
        genre: 'Partyspel',
        playMode: 'MultiPlayer',
        gamePlatform: 'Webbläsare',
        applicationCategory: 'GameApplication',
        operatingSystem: 'Alla med webbläsare',
        numberOfPlayers: game && {
          '@type': 'QuantitativeValue',
          minValue: game.minPlayers,
          ...(game.maxPlayers && { maxValue: game.maxPlayers }),
        },
        isAccessibleForFree: true,
        offers: free,
        isPartOf: { '@id': WEBSITE_ID },
      },
      faqPage(page.faq),
    ],
  }
}

function faqPage(faq: GuideFaq[]): JsonLd {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

const PAGES: Record<string, PageMeta> = {
  '/': HOME,
  '/skapa': {
    title: 'Skapa en lobby | Kompisduellen',
    description:
      'Välj spel, skapa en lobby och bjud in kompisarna med en kod på fyra bokstäver. Gratis, utan konto och utan app.',
    path: '/skapa',
    jsonLd: [],
  },
  '/ga-med': {
    title: 'Gå med i en lobby | Kompisduellen',
    description:
      'Har du fått en kod av en kompis? Skriv in den och hoppa in i spelet direkt från mobilen eller datorn.',
    path: '/ga-med',
    jsonLd: [],
  },
  ...Object.fromEntries(GAME_PAGES.map((page) => [`/spel/${page.slug}`, gamePageMeta(page)])),
  // Guiderna, med sina vanliga frågor som FAQPage.
  ...Object.fromEntries(
    GUIDE_PAGES.map((page) => [
      `/${page.slug}`,
      { title: page.title, description: page.description, path: `/${page.slug}`, jsonLd: [faqPage(page.faq)] },
    ]),
  ),
}

export function pageMeta(pathname: string): PageMeta {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return PAGES[path] ?? DEFAULT
}

// Sidorna som förrenderas till färdig HTML i bygget. Övriga sökvägar får appskalet (app.html).
export const PRERENDER_PATHS: string[] = [
  '/',
  ...GAME_PAGES.map((page) => `/spel/${page.slug}`),
  ...GUIDE_PAGES.map((page) => `/${page.slug}`),
]
// Sidor som syns i sökmotorerna men visar sådant som bara finns i webbläsaren (sparat namn och figur). De får
// appskalet med sina egna taggar i <head>.
export const HEAD_ONLY_PATHS: string[] = ['/skapa', '/ga-med']

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Taggarna för en sida som HTML, med fyra blanksteg indrag som i index.html.
export function renderHeadTags(meta: PageMeta): string {
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const url = meta.path && `${SITE_URL}${meta.path}`
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    url && `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="sv_SE" />`,
    url && `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    ...(meta.image
      ? [
          `<meta property="og:image" content="${SITE_URL}${meta.image.path}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="${escapeHtml(meta.image.alt)}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
        ]
      : [
          `<meta property="og:image" content="${SITE_URL}/icon-512.png" />`,
          `<meta property="og:image:width" content="512" />`,
          `<meta property="og:image:height" content="512" />`,
          `<meta property="og:image:alt" content="Kompisduellens logga" />`,
          `<meta name="twitter:card" content="summary" />`,
        ]),
    meta.jsonLd.length > 0 &&
      `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': meta.jsonLd }).replace(/</g, '\\u003c')}</script>`,
  ]
  return tags.filter(Boolean).map((tag) => `    ${tag}`).join('\n')
}
