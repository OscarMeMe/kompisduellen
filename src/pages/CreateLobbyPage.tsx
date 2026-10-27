import { useNavigate, useSearchParams } from 'react-router'
import { Emoji } from '@/components/Emoji'
import { PageHeader } from '@/components/PageHeader'
import { PlayerSetup } from '@/components/PlayerSetup'
import { findGame, GAMES } from '@/lib/games'
import { generateLobbyCode, markAsHost, requestPractice } from '@/lib/player'
import { rulesFor } from '@/lib/spelregler'
import { track } from '@/lib/statistik'

export function CreateLobbyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const game = findGame(params.get('spel')) ?? GAMES.find((g) => g.playable)!
  // ?testa=1: en provomgång på egen hand, för spel som har det (Gissa priset).
  const practice = params.get('testa') === '1' && rulesFor(game.id).soloPractice === true

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">
      <div className="flex items-center gap-4 rounded-lg border bg-card p-5 shadow-soft">
        <Emoji emoji={game.emoji} className="text-5xl" />
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            {practice ? 'Du testar på egen hand' : 'Du skapar en lobby för'}
          </p>
          <p className="font-heading text-xl font-bold">{game.name}</p>
        </div>
      </div>
      {practice ? (
        <PageHeader
          title="Testa själv"
          description="En provomgång där du spelar ensam. Den räknas inte i kvällens ställning. Efteråt kan du bjuda in kompisar med lobbykoden och spela på riktigt."
        />
      ) : (
        <PageHeader title="Skapa lobby" description="Du blir värd och startar spelet när alla är med." />
      )}
      <PlayerSetup
        submitLabel={practice ? 'Starta provomgången' : 'Skapa lobby'}
        onDone={() => {
          const code = generateLobbyCode()
          markAsHost(code, game.id)
          if (practice) requestPractice(code)
          track('lobby_skapad', { spel: game.id })
          navigate(`/lobby/${code}`)
        }}
      />
    </div>
  )
}
