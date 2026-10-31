import { createElement } from 'react'
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router'
import App from './App.tsx'

// Startpunkten när sidorna förrenderas i bygget (vite-plugin-forrendera.ts). Körs i Node, aldrig i webbläsaren.
export { HEAD_ONLY_PATHS, pageMeta, PRERENDER_PATHS, renderHeadTags } from '@/lib/sidinfo'

// Sidans HTML för en sökväg, som en förstagångsbesökare utan sparat namn ser den. prerender väntar in allt som
// laddas med lazy, så att sidan blir komplett.
export async function render(path: string): Promise<string> {
  const { prelude } = await prerender(createElement(StaticRouter, { location: path }, createElement(App)))
  return new Response(prelude).text()
}
