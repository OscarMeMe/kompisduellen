import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Plugin } from 'vite'

// Förrenderar de publika sidorna (startsidan och spelsidorna) till färdig HTML, så att sökmotorerna får all text
// direkt. Kör bara i produktionsbygget, efter att serverdelen byggts till dist-ssr (se "build" i package.json).
//
// - dist/index.html blir den förrenderade startsidan och dist/spel/x/index.html spelsidorna, med egna taggar i <head>.
// - dist/app.html är det tomma appskalet för alla andra sökvägar (lobbyn, Skapa lobby …). Vercel och service workern
//   pekar dit.
// - Appen startar med createRoot som förut och ritar om sidan, så lobbyn och spelen fungerar precis som innan.
//
// Körs i writeBundle, före service workern skapas i closeBundle, så att de förrenderade sidorna kommer med i den.
type Server = {
  render: (path: string) => Promise<string>
  pageMeta: (path: string) => unknown
  renderHeadTags: (meta: unknown) => string
  PRERENDER_PATHS: string[]
}

const HEAD_BLOCK = /( *<!-- sidinfo -->\r?\n)[\s\S]*?(\r?\n *<!-- \/sidinfo -->)/
const ROOT = '<div id="root"></div>'

export function forrenderaPlugin(): Plugin {
  return {
    name: 'forrendera',
    apply: (_, env) => env.command === 'build' && !env.isSsrBuild,
    async writeBundle(options) {
      const outDir = options.dir ?? 'dist'
      const template = await readFile(path.join(outDir, 'index.html'), 'utf8')
      if (!HEAD_BLOCK.test(template) || !template.includes(ROOT)) {
        throw new Error('index.html saknar <!-- sidinfo --> eller <div id="root"></div>')
      }
      const server: Server = await import(pathToFileURL(path.resolve('dist-ssr/entry-server.js')).href)
      const withHead = (pagePath: string) =>
        template.replace(HEAD_BLOCK, (_, start, end) => `${start}${server.renderHeadTags(server.pageMeta(pagePath))}${end}`)

      // Appskalet får sajtens allmänna taggar, utan kanonisk adress.
      await writeFile(path.join(outDir, 'app.html'), withHead('/app'))

      for (const pagePath of server.PRERENDER_PATHS) {
        const html = await server.render(pagePath)
        const file = path.join(outDir, pagePath, 'index.html')
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(file, withHead(pagePath).replace(ROOT, `<div id="root">${html}</div>`))
      }
    },
  }
}
