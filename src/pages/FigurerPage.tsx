import { useState } from 'react'
import { Emoji } from '@/components/Emoji'
import { Figur } from '@/components/figurer/Figur'
import { Button } from '@/components/ui/button'
import { BLOBS, MOOD_NAMES, MOODS } from '@/lib/figurer'
import { AVATARS } from '@/lib/player'
import { cn } from '@/lib/utils'

// De storlekar figurerna visas i på sajten, från spelarlistorna under spelet till spelarchipsen och topplistan.
const SMALL_SIZES = [
  { label: 'text-sm', className: 'text-sm' },
  { label: 'text-lg', className: 'text-lg' },
  { label: 'text-xl', className: 'text-xl' },
  { label: 'text-2xl', className: 'text-2xl' },
  { label: 'text-3xl', className: 'text-3xl' },
]

// Alla blobbar med alla miner, och alla figurer i emoji-storlek. Finns bara med npm run dev.
export function FigurerPage() {
  const [replay, setReplay] = useState(0)
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Figurer</h1>
        <Button variant="outline" onClick={() => setReplay((n) => n + 1)}>
          Spela rörelserna igen
        </Button>
      </div>

      {BLOBS.map((blob) => (
        <section key={blob.id} className="space-y-3 rounded-lg border bg-card p-4 shadow-soft" aria-label={blob.name}>
          <h2 className="text-xl">{blob.name}</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {MOODS.map((mood) => (
              <li key={mood} className="flex flex-col items-center gap-1 text-center">
                <Figur figure={blob} mood={mood} animated restartKey={replay} className="block text-7xl" />
                <span className="text-sm font-semibold">{MOOD_NAMES[mood]}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="space-y-3 rounded-lg border bg-card p-4 shadow-soft" aria-label="Blobbarna i liten storlek">
        <h2 className="text-xl">Blobbarna i liten storlek</h2>
        <p className="text-sm text-muted-foreground">Alla tolv bredvid varandra, som i spelarlistorna. Inga två ska gå att blanda ihop.</p>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {BLOBS.map((blob) => (
            <li key={blob.id} className="flex flex-col items-center gap-1 rounded-md bg-muted/60 p-2 text-center">
              <span className="flex items-end gap-1.5">
                <Figur figure={blob} className="text-sm" />
                <Figur figure={blob} className="text-lg" />
                <Figur figure={blob} className="text-2xl" />
              </span>
              <span className="text-xs font-semibold">{blob.name}</span>
            </li>
          ))}
        </ul>
        {SMALL_SIZES.slice(0, 2).map((size) => (
          <div key={size.label} className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">{size.label}, i rad</p>
            <div className={cn('flex flex-wrap items-center gap-2', size.className)}>
              {BLOBS.map((blob) => (
                <Figur key={blob.id} figure={blob} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4 shadow-soft" aria-label="Emoji-storlek">
        <h2 className="text-xl">Emoji-storlek</h2>
        {SMALL_SIZES.map((size) => (
          <div key={size.label} className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">{size.label}</p>
            <div className={`flex flex-wrap items-center gap-2 ${size.className}`}>
              {AVATARS.map((avatar) => (
                <Emoji key={avatar} emoji={avatar} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
