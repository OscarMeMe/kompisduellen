import { useEffect, useState } from 'react'

// En identitet i en flik åt gången. Öppnas lobbyn med samma spelare i en ny flik (t.ex. en kopierad flik)
// frågar den nya fliken de andra flikarna via BroadcastChannel. Den äldsta fliken vinner, och den nya visar
// ett besked i stället för att ansluta. Så blir det aldrig två flikar som svarar åt samma spelare, och
// en kopierad värdflik kan inte bli en andra värd med ett gammalt tillstånd.
// Saknas BroadcastChannel (mycket gamla webbläsare) hoppas kontrollen över.

export type TabStatus = 'checking' | 'ok' | 'taken'

// Så länge väntar en ny flik på ett svar från en äldre flik.
const ANSWER_MS = 400

type Message = { type: 'hello' | 'upptagen'; tab: string; to?: string }

export function useOneTab(code: string, playerId: string) {
  const supported = typeof BroadcastChannel !== 'undefined'
  const [status, setStatus] = useState<TabStatus>(supported ? 'checking' : 'ok')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!supported) return
    const tab = crypto.randomUUID()
    const channel = new BroadcastChannel(`kd-flik:${code}:${playerId}`)
    // owner: den här fliken har bestämt sig för att vara spelarens flik och svarar andra att den är upptagen.
    let owner = false
    let decided = false

    channel.onmessage = (event: MessageEvent<Message>) => {
      const message = event.data
      if (message.tab === tab) return
      if (message.type === 'hello' && owner) {
        channel.postMessage({ type: 'upptagen', tab, to: message.tab } satisfies Message)
      } else if (message.type === 'upptagen' && message.to === tab && !decided) {
        decided = true
        setStatus('taken')
      }
    }
    channel.postMessage({ type: 'hello', tab } satisfies Message)

    const timer = setTimeout(() => {
      if (decided) return
      decided = true
      owner = true
      setStatus('ok')
    }, ANSWER_MS)

    return () => {
      clearTimeout(timer)
      channel.close()
    }
  }, [code, playerId, attempt, supported])

  function retry() {
    setStatus('checking')
    setAttempt((n) => n + 1)
  }

  return { status, retry }
}
