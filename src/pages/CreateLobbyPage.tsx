import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { PlayerSetup } from '@/components/PlayerSetup'
import { findGame, GAMES } from '@/lib/games'
import { generateLobbyCode, loadOrCreateGuest, markAsHost, requestPractice } from '@/lib/player'
import { rulesFor } from '@/lib/spelregler'
import { track } from '@/lib/statistik'

export function CreateLobbyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const game = findGame(params.get('spel')) ?? GAMES.find((g) => g.playable)!
  // ?testa=1: en provomgång på egen hand, för spel som har det (Gissa priset).
  const practice = params.get('testa') === '1' && rulesFor(game.id).soloPractice === true

  // Testa själv går direkt: har man inget sparat namn blir man "Gäst" med en slumpad figur (kan ändras senare).
  const started = useRef(false)
  useEffect(() => {
    if (!practice || started.current) return
    started.current = true
    loadOrCreateGuest()
    const code = generateLobbyCode()
    markAsHost(code, game.id)
    requestPractice(code)
    track('lobby_skapad', { spel: game.id })
    navigate(`/lobby/${code}`, { replace: true })
  }, [practice, game.id, navigate])

  if (practice) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p>Startar provrundan i {game.name}…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">
      <div className="flex items-center gap-4 rounded-lg border bg-card p-5 shadow-soft">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Du skapar en lobby för
          </p>
          <p className="font-heading text-xl font-bold">{game.name}</p>
        </div>
      </div>
      <PageHeader title="Skapa lobby" description="Du blir värd och startar spelet när alla är med." />
      <PlayerSetup
        submitLabel="Skapa lobby"
        onDone={() => {
          const code = generateLobbyCode()
          markAsHost(code, game.id)
          track('lobby_skapad', { spel: game.id })
          navigate(`/lobby/${code}`)
        }}
      />
    </div>
  )
}
