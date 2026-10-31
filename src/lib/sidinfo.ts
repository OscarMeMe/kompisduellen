// Det som står i <head> för varje sida: titel, beskrivning, kanonisk adress, Open Graph och strukturerad data
// (JSON-LD). Samma taggar används när sidorna förrenderas i bygget (vite-plugin-forrendera.ts) och när appen byter
// sida i webbläsaren (usePageMeta). Taggarna ligger mellan kommentarerna <!-- sidinfo --> och <!-- /sidinfo -->
// i index.html.

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

const PAGES: Record<string, PageMeta> = {
  '/': HOME,
}

export function pageMeta(pathname: string): PageMeta {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return PAGES[path] ?? DEFAULT
}

// Sidorna som förrenderas till färdig HTML i bygget. Övriga sökvägar får appskalet (app.html).
export const PRERENDER_PATHS: string[] = ['/']

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
    `<meta property="og:image" content="${SITE_URL}/icon-512.png" />`,
    `<meta property="og:image:width" content="512" />`,
    `<meta property="og:image:height" content="512" />`,
    `<meta property="og:image:alt" content="Kompisduellens logga" />`,
    `<meta name="twitter:card" content="summary" />`,
    meta.jsonLd.length > 0 &&
      `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': meta.jsonLd }).replace(/</g, '\\u003c')}</script>`,
  ]
  return tags.filter(Boolean).map((tag) => `    ${tag}`).join('\n')
}
