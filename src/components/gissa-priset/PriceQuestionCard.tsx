import { questionText, type PriceItem } from '@/lib/prisdata'

// Frågan i Gissa priset: bild eller emoji, frågan som stor rubrik och ledtråden i kursiv text under. Används i spelet och på /granska.
export function PriceQuestionCard({ item }: { item: PriceItem | undefined }) {
  return (
    // Bilden visas liggande (2:1) och beskärs med object-cover. På mobilen är den högst 18 % av skärmhöjden,
    // så att gissningsrutan syns utan att man scrollar, och döljs när sidan är riktigt låg (öppet tangentbord). Utan bild visas emojin och ingen tom bildyta.
    <div className="rounded-lg border bg-card p-4 text-center shadow-soft sm:p-8">
      {item?.image ? (
        <figure className="mx-auto max-w-xl">
          <img
            src={item.image}
            alt={item.name}
            className="aspect-2/1 max-h-[18svh] w-full rounded-md object-cover sm:max-h-none [@media(max-height:520px)]:hidden"
          />
          {(item.imageNote || item.imageCredit) && (
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
          )}
        </figure>
      ) : (
        <span className="block text-5xl sm:text-7xl">{item?.emoji ?? '🏷️'}</span>
      )}
      <h1 className="mx-auto mt-3 max-w-xl text-xl leading-snug text-balance sm:mt-4 sm:text-3xl">
        {item ? questionText(item) : 'Vad kostade det?'}
      </h1>
      {item?.clue && (
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground italic sm:mt-3 sm:text-base">Ledtråd: {item.clue}</p>
      )}
    </div>
  )
}
