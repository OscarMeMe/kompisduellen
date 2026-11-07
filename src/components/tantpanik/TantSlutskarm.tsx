import { useEffect, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { Emoji } from '@/components/Emoji'
import { Figur } from '@/components/figurer/Figur'
import { Konfetti } from '@/components/Konfetti'
import { useCountUp } from '@/hooks/useCountUp'
import { findBlob } from '@/lib/figurer'
import type { GameState } from '@/lib/match'
import { EMPTY_TANT_STATS, type TantTable } from '@/lib/tantpanik'
import { tantAwards, tantOutRows, tantStatsLine, type TantAward, type TantAwardId } from '@/lib/tantslut'
import { cn } from '@/lib/utils'

const PATTERN = '/images/tantpanik/vantrum-monster.webp'
const LOGO = '/images/tantpanik/logga-800.webp'

// När varje del kommer fram (ms), som i skissen (docs/skisser/slutskarm): röken lättar, vinnaren hoppar upp, "Sist kvar!",
// namnskylten, de utslagna en i taget, utmärkelserna, siffrorna och sist knapparna.
const AT = { winner: 600, title: 1050, name: 1550, out: 1550, outStep: 250, award: 2450, awardStep: 250, stats: 3400, buttons: 3750 }

// Exploderande Tanters slutskärm: vinnaren står på kafferepsbordet med krona och tantklänning, de utslagna sotiga i den
// ordning de åkte ut, utmärkelserna som någon faktiskt fått och matchens siffror. Revansch och Byt spel ligger fast längst
// ner. Ett tryck var som helst hoppar över animationen. Med "minska rörelse" syns allt direkt, utan rök och konfetti.
export function TantSlutskarm({
  state,
  table,
  meId,
  actions,
  leaderboard,
}: {
  state: GameState
  table: TantTable
  meId: string
  // Knapparna längst ner (värdens val eller gästens önskemål), och Lämna lobby.
  actions: ReactNode
  // Kvällens ställning, under det andra.
  leaderboard: ReactNode
}) {
  const [skipped, setSkipped] = useState(false)
  const reduced = typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const still = skipped || reduced
  // En del som kommer fram: rörelsen (med "minska rörelse" ingen) och när den börjar. Överhoppad: allt på plats direkt.
  const enter = (animation: string, at: number): { className: string; style?: CSSProperties } =>
    still ? { className: '' } : { className: animation, style: { animationDelay: `${at}ms` } }

  const winner = table.winner
  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  const out = tantOutRows(table)
  const awards = tantAwards(table)
  const stats = table.stats ?? EMPTY_TANT_STATS
  const counting = useDelayedFlag(AT.stats, still)
  const moves = Math.round(useCountUp(counting ? stats.moves : 0, 700))
  const stolen = Math.round(useCountUp(counting ? stats.stolen : 0, 700))
  const hidden = Math.round(useCountUp(counting ? stats.hidden : 0, 700))
  const many = out.length > 3

  return (
    <div
      data-spel="tantpanik"
      className="fixed inset-0 z-10 overflow-y-auto bg-tant-kram bg-repeat text-tant-ink"
      style={{ backgroundImage: `url(${PATTERN})`, backgroundSize: '300px 300px' }}
      onClick={() => setSkipped(true)}
    >
      <div className="relative mx-auto flex min-h-full max-w-md flex-col items-center px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-40">
        {!still && <Konfetti delay={800} />}

        <img src={LOGO} alt="Exploderande Tanter" width={800} height={468} style={enter('motion-safe:animate-slut-fade', 0).style} className={cn('h-auto w-42 short:w-24', enter('motion-safe:animate-slut-fade', 0).className)} />

        <h1
          style={enter('motion-safe:animate-slut-pop', AT.title).style}
          className={cn(
            'mt-0.5 text-[2.75rem] leading-none text-tant-vin [text-shadow:0_3px_0_#f2c9a8] short:text-[2.1rem]',
            enter('motion-safe:animate-slut-pop', AT.title).className,
          )}
        >
          Sist kvar!
        </h1>

        {/* Vinnaren på kafferepsbordet, med krona och tantklänning, och namnskylten. */}
        {winner && (
          <div className="relative mt-1 h-[10.6rem] w-60 short:h-[8.4rem] short:w-48">
            <div style={enter('motion-safe:animate-slut-pop', AT.winner).style} className={cn('absolute inset-x-0 bottom-0 flex justify-center', enter('motion-safe:animate-slut-pop', AT.winner).className)}>
              <Kafferepsbord />
            </div>
            <div style={enter('motion-safe:animate-slut-pop', AT.winner).style} className={cn('absolute inset-x-0 top-0 flex justify-center', enter('motion-safe:animate-slut-pop', AT.winner).className)}>
              <div className={cn(!still && 'motion-safe:animate-slut-cheer')} style={still ? undefined : { animationDelay: '1300ms' }}>
                <WinnerFigure avatar={state.players[winner]?.avatar ?? ''} label={`${name(winner)} jublar med krona och tantklänning`} />
              </div>
            </div>
            <div style={enter('motion-safe:animate-slut-pop', AT.name).style} className={cn('absolute -bottom-2.5 left-1/2 -translate-x-1/2', enter('motion-safe:animate-slut-pop', AT.name).className)}>
              <p className="max-w-56 truncate rounded-[10px] border-[3px] border-tant-ink bg-tant-kram-2 px-5 py-0.5 font-heading text-2xl font-bold shadow-[0_3px_0_var(--color-tant-ink)] short:text-xl">
                {winner === meId ? 'Du' : name(winner)}
              </p>
            </div>
          </div>
        )}

        {/* De utslagna, den som åkte ut sist först. */}
        <ul className={cn('mt-5 grid w-full gap-1.5 short:mt-3 short:gap-1', many && 'grid-cols-2')} aria-label="De som exploderade">
          {out.map((row, i) => (
            <li
              key={row.id}
              style={enter('motion-safe:animate-slut-up', AT.out + i * AT.outStep).style}
              className={cn(
                'flex min-w-0 items-center gap-2.5 rounded-[14px] border-[2.5px] border-tant-ink bg-tant-kram-2 py-1 pr-3 pl-1.5 shadow-[0_2px_0_var(--color-tant-ink)] short:py-0.5',
                many && 'gap-1.5 pr-2',
                enter('motion-safe:animate-slut-up', AT.out + i * AT.outStep).className,
              )}
            >
              <span className="relative shrink-0">
                <ExplodedFigure avatar={state.players[row.id]?.avatar ?? ''} small={many} />
                <span className={cn('absolute -top-1.5 -left-1', !still && 'motion-safe:animate-slut-boom')} style={still ? undefined : { animationDelay: `${AT.out + i * AT.outStep}ms` }}>
                  <Small />
                </span>
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className={cn('truncate font-heading font-bold', many ? 'text-base' : 'text-lg short:text-base')}>{row.id === meId ? 'Du' : name(row.id)}</span>
                <span className="text-[13px] font-bold text-[#6b4a3a] short:text-xs">{row.label}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Utmärkelserna, bara de som någon fått, som tre kompakta brickor bredvid varandra. */}
        {awards.length > 0 && (
          <ul className="mt-3 grid w-full grid-cols-3 gap-2 short:mt-2" aria-label="Utmärkelser">
            {awards.map((award, i) => (
              <AwardTile
                key={award.id}
                award={award}
                who={award.ids.map((id) => (id === meId ? 'Du' : name(id)))}
                style={enter('motion-safe:animate-slut-flip', AT.award + i * AT.awardStep).style}
                className={enter('motion-safe:animate-slut-flip', AT.award + i * AT.awardStep).className}
              />
            ))}
          </ul>
        )}

        <p style={enter('motion-safe:animate-slut-fade', AT.stats - 50).style} className={cn('mt-2.5 text-center text-sm font-extrabold text-[#4a3226] short:mt-1.5 short:text-[13px]', enter('motion-safe:animate-slut-fade', AT.stats - 50).className)}>
          {tantStatsLine(still ? stats : { moves, stolen, hidden })}
        </p>

        <div className="mt-8 w-full" onClick={(event) => event.stopPropagation()}>
          {leaderboard}
        </div>
      </div>

      {/* Revansch och Byt spel ligger alltid fast längst ner, och tonas in sist. */}
      <div
        style={enter('motion-safe:animate-slut-fade', AT.buttons).style}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'fixed inset-x-0 bottom-0 z-20 bg-linear-to-b from-tant-kram/0 via-tant-kram via-30% to-tant-kram px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] short:pt-2 short:pb-[max(0.375rem,env(safe-area-inset-bottom))]',
          enter('motion-safe:animate-slut-fade', AT.buttons).className,
        )}
      >
        <div className="mx-auto flex max-w-md flex-col items-center gap-1.5">{actions}</div>
      </div>

      {/* Röken från sista explosionen lättar. */}
      {!still && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30 motion-safe:animate-slut-smoke motion-reduce:hidden"
          style={{
            background:
              'radial-gradient(circle at 30% 40%, rgb(90 80 75 / 0.9) 0, rgb(90 80 75 / 0) 45%), radial-gradient(circle at 70% 55%, rgb(70 60 58 / 0.9) 0, rgb(70 60 58 / 0) 50%), radial-gradient(circle at 50% 75%, rgb(110 100 95 / 0.85) 0, rgb(110 100 95 / 0) 45%), rgb(40 30 28 / 0.75)',
          }}
        />
      )}
    </div>
  )
}

// Blir sant efter ms (eller direkt om allt ska synas direkt), t.ex. när siffrorna börjar räknas upp.
function useDelayedFlag(ms: number, now: boolean): boolean {
  const [on, setOn] = useState(now)
  useEffect(() => {
    if (now) return
    const timer = setTimeout(() => setOn(true), ms)
    return () => clearTimeout(timer)
  }, [ms, now])
  return on || now
}

// Knapparna på slutskärmen, i spelets stil: Revansch vinröd, Byt spel krämvit med vinröd kant.
export function TantSlutKnapp({ children, primary = false, ...props }: { children: ReactNode; primary?: boolean } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'h-[3.375rem] min-w-0 flex-1 rounded-2xl border-[3px] font-heading text-xl font-bold short:h-12 transition-transform active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100',
        primary
          ? 'flex-[1.25] border-tant-ink bg-[#8e1b30] text-white shadow-[0_4px_0_var(--color-tant-ink)] text-[1.375rem]'
          : 'border-[#8e1b30] bg-tant-kram-2 text-tant-ink shadow-[0_4px_0_#8e1b30]',
        props.className,
      )}
    >
      {children}
    </button>
  )
}

// Vinnarens figur: minen vann, kronan och tantklänningen. En emoji-figur visas som den är.
function WinnerFigure({ avatar, label }: { avatar: string; label: string }) {
  const blob = findBlob(avatar)
  if (!blob) return <Emoji emoji={avatar} className="text-[6.5rem] short:text-[5rem]" />
  return (
    <span role="img" aria-label={label}>
      <Figur figure={blob} mood="vann" crown dress className="text-[7.2rem] short:text-[5.6rem]" />
    </span>
  )
}

// En utslagen: träffad, sotig och lite grå.
function ExplodedFigure({ avatar, small }: { avatar: string; small: boolean }) {
  const blob = findBlob(avatar)
  const size = small ? 'text-[1.9rem] short:text-[1.5rem]' : 'text-[2.3rem] short:text-[1.6rem]'
  if (!blob) return <Emoji emoji={avatar} className={cn(size, 'grayscale')} />
  return (
    <span className="relative block">
      <Figur figure={blob} mood="traffad" className={cn(size, 'saturate-[0.45]')} />
      {/* Sot */}
      <svg aria-hidden viewBox="0 0 40 36" className="absolute inset-0 size-full">
        <ellipse cx="15" cy="27" rx="5" ry="3" className="fill-tant-ink" opacity=".35" />
        <ellipse cx="28" cy="15" rx="4" ry="2.5" className="fill-tant-ink" opacity=".3" />
      </svg>
    </span>
  )
}

// En liten smäll vid de utslagna.
function Small() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 20 20">
      <path d="M10 0 L12.5 6 L19 4 L14.5 9.5 L20 13 L13 13.5 L13 20 L9.5 15 L4 19 L5.5 12.5 L0 10 L6 8 L3 2 L8.5 5 Z" style={{ fill: 'var(--tant-guld)', stroke: '#e8483a' }} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

// Kafferepsbordet som vinnaren står på: en krämvit duk med spets, en blomma och två bordsben.
function Kafferepsbord() {
  return (
    <svg aria-hidden viewBox="0 0 220 70" className="h-auto w-55 short:w-44">
      <path d="M20 18 Q110 -4 200 18 L192 44 Q110 60 28 44 Z" className="fill-tant-kram-2 stroke-tant-ink" strokeWidth="3" strokeLinejoin="round" />
      <path
        d="M30 40 Q38 48 46 40 Q54 48 62 40 Q70 48 78 40 Q86 48 94 40 Q102 48 110 40 Q118 48 126 40 Q134 48 142 40 Q150 48 158 40 Q166 48 174 40 Q182 48 190 40"
        className="fill-none stroke-tant-ink"
        strokeWidth="2"
      />
      <circle cx="110" cy="28" r="5" fill="#e8798a" />
      <circle cx="102" cy="30" r="3" fill="#7fb069" />
      <circle cx="118" cy="30" r="3" fill="#7fb069" />
      <rect x="48" y="46" width="9" height="22" rx="3" fill="#8a5a3b" className="stroke-tant-ink" strokeWidth="2.5" />
      <rect x="163" y="46" width="9" height="22" rx="3" fill="#8a5a3b" className="stroke-tant-ink" strokeWidth="2.5" />
    </svg>
  )
}

// En utmärkelse som en liten guldbricka: symbol, titel, vem och vad.
function AwardTile({ award, who, className, style }: { award: TantAward; who: string[]; className: string; style?: CSSProperties }) {
  return (
    <li
      className={cn(
        'flex min-w-0 flex-col items-center gap-0.5 rounded-[14px] border-[2.5px] border-tant-guld-mork bg-[#fff4d6] px-1 pt-2 pb-1.5 text-center shadow-[0_2px_0_var(--color-tant-guld-mork)] short:gap-0 short:pt-1 short:pb-1',
        className,
      )}
      style={style}
    >
      <AwardIcon id={award.id} />
      <span className="font-heading text-sm leading-tight font-bold short:text-[11px]">{award.title}</span>
      {/* Delade utmärkelser radbryts mellan namnen ("Berit, Gunnel och Margit"), aldrig mitt i ett namn, så att alla syns.
          Brickorna i raden blir lika höga (grid), och raden längst ner hamnar på samma höjd. */}
      <span className="max-w-full text-[13px] leading-tight font-extrabold break-words text-tant-vin short:text-[11px] short:leading-[1.15]">
        {who.map((one, i) => (
          <span key={i}>
            <span className="whitespace-nowrap">{one}</span>
            {i < who.length - 2 ? ', ' : i === who.length - 2 ? ' och ' : ''}
          </span>
        ))}
      </span>
      <span className="mt-auto text-[11.5px] font-bold text-[#6b4a3a]">{award.what}</span>
    </li>
  )
}

function AwardIcon({ id }: { id: TantAwardId }) {
  const ink = { stroke: 'var(--tant-ink)' }
  if (id === 'nope')
    return (
      <svg aria-hidden width="38" height="38" viewBox="0 0 38 38" className="short:size-6">
        <path d="M12 4 H26 L34 12 V26 L26 34 H12 L4 26 V12 Z" fill="#c8102e" style={ink} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M15 28 V16 M18.5 27 V12 M22 27 V13 M25.5 27 V16 M15 24 Q14 30 20 30 Q26 30 25.5 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <path d="M11 6 L14 1 L17 5 L19 0 L21 5 L24 1 L27 6" style={{ fill: 'var(--tant-guld)', ...ink }} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  if (id === 'tjuv')
    return (
      <svg aria-hidden width="38" height="38" viewBox="0 0 38 38" className="short:size-6">
        <rect x="5" y="8" width="17" height="24" rx="3" transform="rotate(-12 13 20)" className="fill-tant-kram-2" style={ink} strokeWidth="2.5" />
        <rect x="15" y="6" width="17" height="24" rx="3" transform="rotate(10 23 18)" className="fill-tant-kram-2" style={ink} strokeWidth="2.5" />
        <path d="M17 15 Q24 12 31 16 L30 20 Q27 18 25 19 Q23 18 19 20 Z" className="fill-tant-ink" />
      </svg>
    )
  return (
    <svg aria-hidden width="38" height="38" viewBox="0 0 38 38" className="short:size-6">
      <path d="M14 4 Q12 7 14 10 M20 3 Q18 6 20 9" fill="none" stroke="#6b4a3a" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 14 H27 V24 Q27 31 17 31 Q7 31 7 24 Z" className="fill-tant-kram-2" style={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M27 17 Q33 17 32 22 Q31 26 26 25" fill="none" style={ink} strokeWidth="2.5" />
      <ellipse cx="17" cy="34" rx="13" ry="2.5" fill="#e9d9c4" style={ink} strokeWidth="2" />
      <circle cx="17" cy="21" r="3" fill="#c8102e" />
    </svg>
  )
}
