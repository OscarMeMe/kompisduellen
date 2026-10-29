import { Maximize2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { questionText, type PriceItem } from '@/lib/prisdata'

// Frågan i Gissa priset: bild eller emoji, frågan som stor rubrik och ledtråden i kursiv text under. Används i spelet och på /granska.
export function PriceQuestionCard({ item }: { item: PriceItem | undefined }) {
  return (
    // Bilden visas liggande (2:1) och beskärs med object-cover. Storleken följer skärmhöjden (högst 18 % av höjden på mobil,
    // 22 % på större skärmar och 16 % på en låg datorskärm), så att svarsfältet och knappen syns utan att man scrollar. Bilden döljs när
    // sidan är riktigt låg (öppet tangentbord). Ett tryck på bilden visar den större. Utan bild visas emojin och ingen tom bildyta.
    <div className="rounded-lg border bg-card p-4 text-center shadow-soft sm:p-6 sm:short:p-4">
      {item?.image ? (
        <figure className="mx-auto max-w-xl">
          <Dialog>
            <DialogTrigger
              className="group relative mx-auto block w-full max-w-[36svh] cursor-zoom-in rounded-md outline-none focus-visible:ring-4 focus-visible:ring-primary/30 sm:max-w-[44svh] sm:short:max-w-[32svh] [@media(max-height:520px)]:hidden"
              aria-label="Visa bilden större"
            >
              <img src={item.image} alt={item.name} className="aspect-2/1 w-full rounded-md object-cover" />
              <span
                aria-hidden
                className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-soft-sm transition-transform motion-safe:group-hover:scale-110"
              >
                <Maximize2 className="size-4" />
              </span>
            </DialogTrigger>
            <DialogContent className="gap-3 p-3 pt-12 sm:max-w-3xl">
              <DialogTitle className="sr-only">{item.name}</DialogTitle>
              <figure>
                <img src={item.image} alt={item.name} className="max-h-[80svh] w-full rounded-md object-contain" />
                <ImageCaption item={item} />
              </figure>
            </DialogContent>
          </Dialog>
          <ImageCaption item={item} />
        </figure>
      ) : (
        <span className="block text-5xl sm:text-7xl">{item?.emoji ?? '🏷️'}</span>
      )}
      <h1 className="mx-auto mt-3 max-w-2xl text-xl leading-snug text-balance sm:mt-4 sm:text-3xl sm:short:mt-3 sm:short:text-2xl">
        {item ? questionText(item) : 'Vad kostade det?'}
      </h1>
      {item?.clue && (
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground italic sm:mt-3 sm:text-base sm:short:mt-2">Ledtråd: {item.clue}</p>
      )}
    </div>
  )
}

// Raden under bilden: vad bilden visar och fotografens kredit (länkad till bildens sida).
function ImageCaption({ item }: { item: PriceItem }) {
  if (!item.imageNote && !item.imageCredit) return null
  return (
    <figcaption className="mt-1 text-xs text-muted-foreground">
      {item.imageNote}
      {item.imageNote && item.imageCredit && ' · '}
      {item.imageCredit &&
        (item.imageSource ? (
          <a href={item.imageSource} target="_blank" rel="noreferrer" className="hover:underline">
            {item.imageCredit}
          </a>
        ) : (
          item.imageCredit
        ))}
    </figcaption>
  )
}
