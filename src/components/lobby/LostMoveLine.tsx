// En rad i facit när min gissning eller mitt kort aldrig nådde värden, så att man förstår varför man inte fick poäng.
export function LostMoveLine({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p role="status" className="rounded-md bg-coral-soft px-4 py-3 text-center font-semibold animate-pop">
      {text}
    </p>
  )
}
