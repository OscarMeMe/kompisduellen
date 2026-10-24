import { useNavigate, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { PlayerSetup } from '@/components/PlayerSetup'
import { findGame, GAMES } from '@/lib/games'
import { generateLobbyCode, markAsHost } from '@/lib/player'

export function CreateLobbyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const game = findGame(params.get('spel')) ?? GAMES.find((g) => g.playable)!

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">
      <div className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm">
        <span className="text-5xl">{game.emoji}</span>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Du skapar en lobby för</p>
          <p className="text-xl font-black">{game.name}</p>
        </div>
      </div>
      <PageHeader title="Skapa lobby" description="Du blir värd och startar spelet när alla är med." />
      <PlayerSetup
        submitLabel="Skapa lobby"
        onDone={() => {
          const code = generateLobbyCode()
          markAsHost(code, game.id)
          navigate(`/lobby/${code}`)
        }}
      />
    </div>
  )
}
