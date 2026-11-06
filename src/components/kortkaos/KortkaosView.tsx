import { Gavel, Loader2 } from 'lucide-react'
import { LostMoveLine } from '@/components/lobby/LostMoveLine'
import { Emoji } from '@/components/Emoji'
import { Solfjader } from '@/components/kort/Solfjader'
import { PromptCard } from '@/components/kort/PlayingCard'
import { ChoosingStep } from '@/components/kortkaos/ChoosingStep'
import { handCards } from '@/components/kortkaos/hand'
import { JudgingStep } from '@/components/kortkaos/JudgingStep'
import { Center, Kortbord, Middle } from '@/components/kortkaos/Kortbord'
import { PlayerStatus } from '@/components/kortkaos/PlayerStatus'
import { RevealStep } from '@/components/kortkaos/RevealStep'
import { ThrowBar } from '@/components/lobby/Kast'
import { RoundTimer } from '@/components/lobby/LobbyLayout'
import { TimeWarningFrame } from '@/components/lobby/TimeWarningFrame'
import type { CardViewProps } from '@/components/lobby/types'
import { useTimeWarning } from '@/hooks/useTimeWarning'
import { findGame } from '@/lib/games'
import type { MyHand } from '@/lib/kort'
import { kortkaosRules } from '@/lib/kortkaos'
import type { GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

// Kortkaos: hela rundan i en vy på ett mörkt spelbord. Vilket steg som visas styrs av state.cards.step.
// LobbyPage ger vyn en ny key för varje frågekort, så att val och utkast börjar om.
// På dator (lg) är bordet lika högt som skärmen: överst domaren och vilka som har valt, i mitten frågekortet och
// längst ner handen. På mobilen ligger allt under varandra som förut.
export function KortkaosView({ state, me, online, isHost, clockOffset, hand, lostMove, onMove, onNext }: CardViewProps) {
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-6 sm:short:gap-4 sm:short:pt-2 lg:max-w-5xl lg:gap-3 lg:short:pt-1">
      <TimeWarningFrame warning={warning} secondsLeft={secondsLeft} />
      <RoundTimer state={state} clockOffset={clockOffset} totalSeconds={kortkaosRules.seconds[table.step]} warning={warning} />

      <Kortbord>
        {/* Under avslöjandet på dator syns vinnaren i stället, så att ställningen och nedräkningen får plats. */}
        <div
          className={cn(
            'flex flex-col items-center gap-3 lg:flex-row',
            table.step === 'choosing' && 'lg:justify-between',
            table.step === 'reveal' && 'lg:hidden',
          )}
        >
          <JudgeBanner state={state} meId={me.id} />
          {table.step === 'choosing' && (
            <PlayerStatus state={state} online={online} clockOffset={clockOffset} compact className="hidden lg:flex" />
          )}
          {/* På dator ligger kasten uppe i hörnet, så att de inte tar plats från handen. */}
          {table.step === 'choosing' && (
            <div className="hidden rounded-lg bg-card/95 px-3 py-1.5 text-foreground shadow-soft-sm lg:[&:not(:empty)]:block">
              <ThrowBar className="lg:flex-row lg:gap-3" />
            </div>
          )}
        </div>

        {table.step === 'question' && (
          <Middle>
            {table.retried && (
              <p role="status" className="rounded-md bg-coral-soft px-4 py-3 text-center font-semibold text-foreground animate-pop">
                För få kort kom in, så det blir ett nytt frågekort.
              </p>
            )}
            <Center>
              <PromptCard prompt={prompt} footer={footer} className="animate-pop lg:w-full lg:max-w-2xl" />
            </Center>
            <p className="text-center font-semibold text-background">
              {isJudge ? 'Läs upp frågan! Snart lägger de andra sina kort.' : 'Läs frågan. Snart får du välja ett kort.'}
            </p>
            {!isJudge && hand && <HandPreview hand={hand} />}
          </Middle>
        )}

        {table.step === 'choosing' &&
          (isJudge || !hand ? (
            <Middle>
              <Center>
                <PromptCard prompt={prompt} footer={footer} className="lg:w-full lg:max-w-2xl" />
              </Center>
              <p className="flex items-center justify-center gap-2 self-center rounded-md bg-coral-soft px-6 py-4 text-center font-semibold text-foreground">
                <Loader2 className="size-5 animate-spin" aria-hidden />
                {isJudge ? 'Väntar på svar' : 'Du får kort från nästa runda'}
              </p>
            </Middle>
          ) : (
            <ChoosingStep prompt={prompt} hand={hand} done={table.done.includes(me.id)} footer={footer} onMove={onMove} />
          ))}

        {table.step === 'choosing' && (
          <PlayerStatus state={state} online={online} clockOffset={clockOffset} className="lg:hidden" />
        )}

        {table.step === 'judging' && (
          <JudgingStep state={state} prompt={prompt} isJudge={isJudge} clockOffset={clockOffset} onMove={onMove} />
        )}

        <div className="text-foreground">
          <LostMoveLine text={lostMove} />
        </div>

        {table.step === 'reveal' && (
          <RevealStep state={state} me={me} prompt={prompt} isHost={isHost} clockOffset={clockOffset} onNext={onNext} />
        )}
      </Kortbord>
    </div>
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
        'flex items-center justify-center gap-2 rounded-full border bg-sun-soft px-4 py-1.5 whitespace-nowrap text-foreground shadow-soft-sm',
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
  return <Solfjader label="Din hand" cards={handCards(hand)} />
}
