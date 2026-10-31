import { Gavel, Loader2 } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Hand, HandSlot } from '@/components/kort/Hand'
import { AnswerCard, PromptCard } from '@/components/kort/PlayingCard'
import { ChoosingStep } from '@/components/kortkaos/ChoosingStep'
import { JudgingStep } from '@/components/kortkaos/JudgingStep'
import { PlayerStatus } from '@/components/kortkaos/PlayerStatus'
import { RevealStep } from '@/components/kortkaos/RevealStep'
import { RoundTimer, Wide } from '@/components/lobby/LobbyLayout'
import { TimeWarningFrame } from '@/components/lobby/TimeWarningFrame'
import type { CardViewProps } from '@/components/lobby/types'
import { useTimeWarning } from '@/hooks/useTimeWarning'
import { findGame } from '@/lib/games'
import { capitalize, type MyHand } from '@/lib/kort'
import { kortkaosRules } from '@/lib/kortkaos'
import type { GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

// Kortkaos: hela rundan i en vy. Vilket steg som visas styrs av state.cards.step.
// LobbyPage ger vyn en ny key för varje frågekort, så att val och utkast börjar om.
export function KortkaosView({ state, me, online, isHost, clockOffset, hand, onMove, onNext }: CardViewProps) {
  const table = state.cards
  // Tiden varnar bara när jag har något kvar att göra: lägga mitt kort, eller välja vinnare som domare.
  const myTurn =
    (table?.step === 'choosing' && table.judge !== me.id && hand !== null && !table.done.includes(me.id)) ||
    (table?.step === 'judging' && table.judge === me.id)
  const { warning, secondsLeft } = useTimeWarning(
    state.deadline,
    clockOffset,
    kortkaosRules.seconds[table?.step ?? 'choosing'],
    !myTurn,
  )
  if (!table) return null
  const prompt = kortkaosRules.promptText(table.prompt)
  const isJudge = table.judge === me.id
  const game = findGame(state.game)
  const footer = game && (
    <span className="inline-flex items-center gap-1.5">
      <Emoji emoji={game.emoji} /> {game.name}
    </span>
  )

  return (
    <Wide>
      <TimeWarningFrame warning={warning} secondsLeft={secondsLeft} />
      <RoundTimer state={state} clockOffset={clockOffset} totalSeconds={kortkaosRules.seconds[table.step]} warning={warning} />
      <JudgeBanner state={state} meId={me.id} />

      {table.step === 'question' && (
        <>
          {table.retried && (
            <p role="status" className="rounded-md bg-coral-soft px-4 py-3 text-center font-semibold animate-pop">
              För få kort kom in, så det blir ett nytt frågekort.
            </p>
          )}
          <PromptCard prompt={prompt} footer={footer} className="animate-pop" />
          <p className="text-center font-semibold text-muted-foreground">
            {isJudge ? 'Läs upp frågan! Snart lägger de andra sina kort.' : 'Läs frågan. Snart får du välja ett kort.'}
          </p>
          {!isJudge && hand && <HandPreview hand={hand} />}
        </>
      )}

      {table.step === 'choosing' &&
        (isJudge || !hand ? (
          <>
            <PromptCard prompt={prompt} footer={footer} />
            <p className="flex items-center justify-center gap-2 rounded-md bg-coral-soft py-4 text-center font-semibold">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              {isJudge ? 'Väntar på svar' : 'Du får kort från nästa runda'}
            </p>
          </>
        ) : (
          <ChoosingStep prompt={prompt} hand={hand} done={table.done.includes(me.id)} footer={footer} onMove={onMove} />
        ))}

      {table.step === 'choosing' && <PlayerStatus state={state} online={online} clockOffset={clockOffset} />}

      {table.step === 'judging' && (
        <JudgingStep state={state} prompt={prompt} isJudge={isJudge} clockOffset={clockOffset} onMove={onMove} />
      )}

      {table.step === 'reveal' && (
        <RevealStep state={state} me={me} prompt={prompt} isHost={isHost} clockOffset={clockOffset} onNext={onNext} />
      )}
    </Wide>
  )
}

function JudgeBanner({ state, meId }: { state: GameState; meId: string }) {
  const judgeId = state.cards!.judge
  const judge = state.players[judgeId]
  // När det blir min tur att välja vinnare pulserar rutan en gång och "Din tur!" poppar in (ny key startar om).
  const myTurn = judgeId === meId && state.cards!.step === 'judging'
  return (
    <div
      key={myTurn ? 'min-tur' : 'vantar'}
      className={cn(
        'flex items-center justify-center gap-2 self-center rounded-full border bg-sun-soft px-4 py-1.5 shadow-soft-sm',
        myTurn && 'motion-safe:animate-turn-pulse',
      )}
    >
      <Gavel className="size-4 shrink-0" aria-hidden />
      {judge && <Emoji emoji={judge.avatar} className="text-xl" />}
      <p className="font-heading text-sm font-bold">
        {judgeId === meId ? 'Du är domare den här rundan' : `${judge?.name ?? 'Någon'} är domare`}
      </p>
      {myTurn && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground motion-safe:animate-pop motion-reduce:animate-fade">
          Din tur!
        </span>
      )}
    </div>
  )
}

// Handen medan frågekortet visas. Korten går att titta på men inte välja än.
function HandPreview({ hand }: { hand: MyHand }) {
  return (
    <Hand label="Din hand">
      {hand.cards.map((card) => (
        <HandSlot key={card}>
          <AnswerCard>{capitalize(kortkaosRules.answerText(card))}</AnswerCard>
        </HandSlot>
      ))}
      {hand.blank && (
        <HandSlot>
          <AnswerCard blank footer="Skriv ett eget svar">
            Blankt kort
          </AnswerCard>
        </HandSlot>
      )}
    </Hand>
  )
}
