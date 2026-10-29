// Ställningen för mig medan jag väntar på de andra (waitingStanding i match.ts), t.ex. "Du leder med 7 poäng. Håll ihop nu."
export function WaitingStanding({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="mx-auto w-fit max-w-full rounded-full bg-sun-soft px-3 py-1 text-sm font-semibold text-balance motion-safe:animate-pop">
      {text}
    </p>
  )
}
