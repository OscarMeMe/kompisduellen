import type { PriceItem } from '@/lib/prisdata'

// Frågan i Gissa priset: bild eller emoji, årtal, namn och ledtråd. Används i spelet och på /granska.
export function PriceQuestionCard({ item }: { item: PriceItem | undefined }) {
  return (
    // Kompakt på mobilen: figur och årtal på samma rad, så att frågan och rutan syns samtidigt.
    // Har saken en bild visas den i stället för emojin, lagom låg för att rutan ska synas.
    <div className="rounded-lg border bg-card p-4 text-center shadow-soft sm:p-8">
      {item?.image && (
        <figure className="mb-3 sm:mb-4">
          <img
            src={item.image}
            alt={item.name}
            className="mx-auto max-h-40 w-auto max-w-full rounded-md object-contain sm:max-h-72"
          />
          {item.imageCredit && (
            <figcaption className="mt-1 text-xs text-muted-foreground">
              {item.imageSource ? (
                <a href={item.imageSource} target="_blank" rel="noreferrer" className="hover:underline">
                  {item.imageCredit}
                </a>
              ) : (
                item.imageCredit
              )}
            </figcaption>
          )}
        </figure>
      )}
      <div className="flex items-center justify-center gap-3">
        {!item?.image && <span className="text-5xl sm:text-7xl">{item?.emoji ?? '🏷️'}</span>}
        {item && (
          <span className="rounded-full bg-primary px-4 py-1 font-heading text-lg font-bold text-primary-foreground shadow-primary sm:px-5 sm:py-1.5 sm:text-xl">
            År {item.year}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-muted-foreground sm:mt-3 sm:text-base">
        Vad kostade det{item && <> år <span className="font-bold text-primary">{item.year}</span></>}?
      </p>
      <h1 className="mx-auto mt-1 max-w-xl text-xl text-balance sm:text-3xl">{item?.name ?? 'Okänd sak'}</h1>
      {item?.clue && (
        <p className="mx-auto mt-2 w-fit max-w-xl rounded-md bg-sky-soft px-4 py-1.5 text-sm font-semibold sm:mt-3">
          {item.clue}
        </p>
      )}
    </div>
  )
}
