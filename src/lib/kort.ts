// Kortlogik för kortspel med domare: alla har svarskort på handen, en domare per runda visar ett
// frågekort och väljer det bästa svaret bland korten som spelats anonymt. Används av Kortkaos och
// kan återanvändas av fler kortspel med andra kort och tider (CardGameRules).
//
// Det hemliga (leken, allas händer och vem som spelade vilket kort) ligger i CardSecrets. Det har
// bara värden, och det skickas aldrig med det vanliga tillståndet. Varje spelare får sin egen hand
// (myHand) i ett eget meddelande. Vem som spelade vad blir offentligt först när rundan avslöjas.
// Rena funktioner utan React eller Supabase.

import { findGame } from '@/lib/games'
import type { GameState } from '@/lib/match'

// Luckan i ett frågekort.
export const GAP = '___'

export type CardGameRules = {
  roundOptions: readonly number[]
  defaultRounds: number
  handSize: number
  // Längsta svar man får skriva på sitt blanka kort.
  blankMaxLength: number
  // Sekunder för varje steg i rundan.
  seconds: { question: number; choosing: number; judging: number; reveal: number }
  // Kortens id. Texten hämtas med promptText och answerText.
  prompts: readonly string[]
  answers: readonly string[]
  promptText: (id: string) => string
  answerText: (id: string) => string
  howTo: string
  scoringDetails: string[]
}

// Kortet en spelare har valt: ett kort från handen eller det blanka kortet med egen text.
export type Pick = { kind: 'card'; card: string } | { kind: 'blank'; text: string }

export type CardMove =
  | { type: 'pick'; pick: Pick; done?: boolean }
  | { type: 'done' }
  | { type: 'judge'; key: string }

// Ett insänt kort som alla ser. key säger inget om vem som spelade det.
export type Submission = { key: string; text: string }

// En vunnen runda, för "Matchens bästa kort". asleep = domaren somnade och vinnaren slumpades.
export type CardWin = { round: number; prompt: string; text: string; player: string; asleep: boolean }

// question: frågekortet visas. choosing: alla utom domaren väljer kort. judging: domaren väljer.
// reveal: vinnaren och vem som spelade vad visas.
export type CardStep = 'question' | 'choosing' | 'judging' | 'reveal'

// Det alla får se av rundan.
export type CardTable = {
  step: CardStep
  // Domarordningen. Nya spelare hamnar sist.
  order: string[]
  judge: string
  prompt: string
  // Rundan görs om med ett nytt frågekort eftersom för få kort kom in.
  retried: boolean
  // Vilka som har valt ett kort (men inte vilket) och vilka som har tryckt Spela kortet.
  chosen: string[]
  done: string[]
  // Korten i slumpad ordning under judging och reveal.
  submissions: Submission[]
  winner: string | null
  // key → spelare. Finns bara under reveal.
  owners: Record<string, string> | null
  judgeAsleep: boolean
  // För få kort kom in även efter omtaget, så rundan gick vidare utan poäng.
  skipped: boolean
  wins: CardWin[]
}

// Det bara värden vet.
export type CardSecrets = {
  promptPile: string[]
  answerPile: string[]
  hands: Record<string, string[]>
  // Har spelaren kvar sitt blanka kort?
  blank: Record<string, boolean>
  picks: Record<string, Pick>
  // Insända kort i rundan: key → vem och vilket kort.
  submitted: Record<string, { player: string; pick: Pick }>
}

// Det en spelare får veta om sin egen hand.
export type MyHand = { cards: string[]; blank: boolean; pick: Pick | null }

export type CardHost = { state: GameState; secrets: CardSecrets }

type Random = () => number

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

// Drar kort från toppen av högen. Tar högen slut blir det färre kort, för samma kort kommer aldrig
// tillbaka i en match.
export function draw(pile: readonly string[], count: number): { drawn: string[]; pile: string[] } {
  const n = Math.max(0, Math.min(count, pile.length))
  return { drawn: pile.slice(0, n), pile: pile.slice(n) }
}

export function refillHand(hand: readonly string[], pile: readonly string[], size: number) {
  const { drawn, pile: rest } = draw(pile, size - hand.length)
  return { hand: [...hand, ...drawn], pile: rest }
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Frågan uppdelad runt luckan, så att svaret kan visas annorlunda. Svaret får stor bokstav om luckan
// börjar en mening. Saknas luckan hamnar svaret sist.
export function promptParts(prompt: string, answer: string): { before: string; answer: string; after: string } {
  const i = prompt.indexOf(GAP)
  if (i === -1) return { before: `${prompt} `, answer: capitalize(answer), after: '' }
  const before = prompt.slice(0, i)
  const startsSentence = before.trim() === '' || /[.!?]\s*$/.test(before)
  return { before, answer: startsSentence ? capitalize(answer) : answer, after: prompt.slice(i + GAP.length) }
}

// Frågan med svaret i luckan.
export function fillPrompt(prompt: string, answer: string): string {
  const parts = promptParts(prompt, answer)
  return parts.before + parts.answer + parts.after
}

// Texten på ett blankt kort: ett mellanslag mellan orden, ingen punkt på slutet och inte för lång.
export function cleanBlank(text: string, maxLength: number): string {
  return text.replace(/\s+/g, ' ').trim().replace(/[.]+$/, '').slice(0, maxLength).trim()
}

// Nästa domare efter current i ordningen som fortfarande är med.
export function nextJudge(order: readonly string[], current: string, activeIds: readonly string[]): string {
  const start = order.indexOf(current)
  for (let step = 1; step <= order.length; step++) {
    const id = order[(start + step) % order.length]
    if (activeIds.includes(id)) return id
  }
  return current
}

export function myHand(secrets: CardSecrets, playerId: string): MyHand | null {
  const cards = secrets.hands[playerId]
  if (!cards) return null
  return { cards, blank: secrets.blank[playerId] ?? false, pick: secrets.picks[playerId] ?? null }
}

export function startCardMatch(state: GameState, rules: CardGameRules, now: number, random: Random = Math.random) {
  const order = Object.keys(state.players)
  let answerPile = shuffle(rules.answers, random)
  const hands: Record<string, string[]> = {}
  const blank: Record<string, boolean> = {}
  for (const id of order) {
    const dealt = draw(answerPile, rules.handSize)
    hands[id] = dealt.drawn
    answerPile = dealt.pile
    blank[id] = true
  }
  const table: CardTable = {
    step: 'question',
    order,
    judge: order[0],
    prompt: '',
    retried: false,
    chosen: [],
    done: [],
    submissions: [],
    winner: null,
    owners: null,
    judgeAsleep: false,
    skipped: false,
    wins: [],
  }
  const secrets: CardSecrets = {
    promptPile: shuffle(rules.prompts, random),
    answerPile,
    hands,
    blank,
    picks: {},
    submitted: {},
  }
  return startCardRound({ state: { ...state, cards: table }, secrets }, rules, 1, order[0], now, false)
}

// Startar en runda med ett nytt frågekort. Alla fyller först på handen igen.
function startCardRound(
  host: CardHost,
  rules: CardGameRules,
  round: number,
  judge: string,
  now: number,
  retried: boolean,
): CardHost {
  const { state, secrets } = host
  const table = state.cards!
  const [prompt, ...promptPile] = secrets.promptPile
  if (prompt === undefined) return finish(host)

  let answerPile = secrets.answerPile
  const hands = { ...secrets.hands }
  for (const id of table.order) {
    if (!hands[id]) continue
    const refilled = refillHand(hands[id], answerPile, rules.handSize)
    hands[id] = refilled.hand
    answerPile = refilled.pile
  }

  return {
    state: {
      ...state,
      phase: 'playing',
      round,
      deadline: now + rules.seconds.question * 1000,
      cards: {
        ...table,
        step: 'question',
        judge,
        prompt,
        retried,
        chosen: [],
        done: [],
        submissions: [],
        winner: null,
        owners: null,
        judgeAsleep: false,
        skipped: false,
      },
    },
    secrets: { ...secrets, promptPile, answerPile, hands, picks: {}, submitted: {} },
  }
}

// Matchen är slut. match.ts lägger in resultatet i topplistan.
function finish(host: CardHost): CardHost {
  return { ...host, state: { ...host.state, phase: 'finished', deadline: null } }
}

function validPick(secrets: CardSecrets, rules: CardGameRules, playerId: string, pick: Pick): Pick | null {
  if (pick.kind === 'card') {
    return secrets.hands[playerId]?.includes(pick.card) ? { kind: 'card', card: pick.card } : null
  }
  if (!secrets.blank[playerId] || typeof pick.text !== 'string') return null
  const text = cleanBlank(pick.text, rules.blankMaxLength)
  return text ? { kind: 'blank', text } : null
}

// Har alla som är med (utom domaren) tryckt Spela kortet?
function everyoneDone(host: CardHost, activeIds: readonly string[]): boolean {
  const table = host.state.cards!
  const players = activeIds.filter((id) => id !== table.judge && host.secrets.hands[id])
  return players.length > 0 && players.every((id) => table.done.includes(id))
}

export function cardMove(
  host: CardHost,
  rules: CardGameRules,
  playerId: string,
  move: CardMove,
  activeIds: readonly string[],
  now: number,
  random: Random = Math.random,
): CardHost {
  const { state, secrets } = host
  const table = state.cards
  if (state.phase !== 'playing' || !table) return host

  if (move.type === 'judge') {
    if (table.step !== 'judging' || playerId !== table.judge || !secrets.submitted[move.key]) return host
    return reveal(host, rules, move.key, false, now)
  }

  if (table.step !== 'choosing' || playerId === table.judge || !secrets.hands[playerId]) return host
  if (table.done.includes(playerId)) return host

  let picks = secrets.picks
  let chosen = table.chosen
  if (move.type === 'pick') {
    const pick = validPick(secrets, rules, playerId, move.pick)
    if (!pick) return host
    picks = { ...picks, [playerId]: pick }
    if (!chosen.includes(playerId)) chosen = [...chosen, playerId]
  }
  const finished = (move.type === 'done' || move.done === true) && picks[playerId] !== undefined
  const done = finished ? [...table.done, playerId] : table.done
  if (picks === secrets.picks && done === table.done) return host

  const next: CardHost = { state: { ...state, cards: { ...table, chosen, done } }, secrets: { ...secrets, picks } }
  return everyoneDone(next, activeIds) ? toJudging(next, rules, now, random) : next
}

// Valtiden är slut (eller alla är klara). Korten blandas och visas utan namn. Kom färre än två kort
// in görs rundan om en gång med ett nytt frågekort. Händer det igen går rundan vidare utan poäng.
function toJudging(host: CardHost, rules: CardGameRules, now: number, random: Random): CardHost {
  const { state, secrets } = host
  const table = state.cards!
  const players = Object.keys(secrets.picks).filter((id) => id !== table.judge && secrets.hands[id])
  if (players.length < 2) {
    if (!table.retried) return startCardRound(host, rules, state.round, table.judge, now, true)
    return skipRound(host, rules, now)
  }

  const hands = { ...secrets.hands }
  const blank = { ...secrets.blank }
  const submitted: CardSecrets['submitted'] = {}
  const submissions: Submission[] = []
  shuffle(players, random).forEach((id, i) => {
    const key = `k${i + 1}`
    const pick = secrets.picks[id]
    submitted[key] = { player: id, pick }
    if (pick.kind === 'card') {
      submissions.push({ key, text: rules.answerText(pick.card) })
      hands[id] = hands[id].filter((card) => card !== pick.card)
    } else {
      submissions.push({ key, text: pick.text })
      blank[id] = false
    }
  })

  return {
    state: {
      ...state,
      deadline: now + rules.seconds.judging * 1000,
      cards: { ...table, step: 'judging', submissions },
    },
    secrets: { ...secrets, hands, blank, picks: {}, submitted },
  }
}

function skipRound(host: CardHost, rules: CardGameRules, now: number): CardHost {
  const { state, secrets } = host
  return {
    state: {
      ...state,
      deadline: now + rules.seconds.reveal * 1000,
      cards: { ...state.cards!, step: 'reveal', submissions: [], winner: null, owners: {}, skipped: true },
    },
    secrets: { ...secrets, picks: {}, submitted: {} },
  }
}

function ownersOf(secrets: CardSecrets): Record<string, string> {
  return Object.fromEntries(Object.entries(secrets.submitted).map(([key, { player }]) => [key, player]))
}

// Vinnaren får en poäng, och alla får se vem som spelade vilket kort.
function reveal(host: CardHost, rules: CardGameRules, key: string, asleep: boolean, now: number): CardHost {
  const { state, secrets } = host
  const table = state.cards!
  const winner = secrets.submitted[key].player
  const text = table.submissions.find((s) => s.key === key)?.text ?? ''
  return {
    ...host,
    state: {
      ...state,
      deadline: now + rules.seconds.reveal * 1000,
      scores: { ...state.scores, [winner]: (state.scores[winner] ?? 0) + 1 },
      cards: {
        ...table,
        step: 'reveal',
        winner: key,
        owners: ownersOf(secrets),
        judgeAsleep: asleep,
        wins: [...table.wins, { round: state.round, prompt: table.prompt, text, player: winner, asleep }],
      },
    },
  }
}

function nextCardRound(host: CardHost, rules: CardGameRules, now: number, activeIds: readonly string[]): CardHost {
  const { state } = host
  if (state.round >= state.rounds) return finish(host)
  const table = state.cards!
  return startCardRound(host, rules, state.round + 1, nextJudge(table.order, table.judge, activeIds), now, false)
}

// Värdens timer. Gör bara något om klockan som löpte ut fortfarande är den som gäller.
export function cardDeadline(
  host: CardHost,
  rules: CardGameRules,
  now: number,
  deadline: number,
  activeIds: readonly string[],
  random: Random = Math.random,
): CardHost {
  const { state } = host
  const table = state.cards
  if (state.phase !== 'playing' || !table || state.deadline !== deadline || now < deadline) return host
  switch (table.step) {
    case 'question':
      return {
        ...host,
        state: { ...state, deadline: now + rules.seconds.choosing * 1000, cards: { ...table, step: 'choosing' } },
      }
    case 'choosing':
      return toJudging(host, rules, now, random)
    case 'judging': {
      // Domaren somnade: ett slumpat kort vinner.
      const keys = table.submissions.map((s) => s.key)
      return reveal(host, rules, keys[Math.floor(random() * keys.length)], true, now)
    }
    case 'reveal':
      return nextCardRound(host, rules, now, activeIds)
  }
}

// Värden går vidare från avslöjandet. round = rundan som visades, så att ett dubbelklick inte hoppar
// över en runda.
export function advanceCardReveal(
  host: CardHost,
  rules: CardGameRules,
  now: number,
  round: number,
  activeIds: readonly string[],
): CardHost {
  const { state } = host
  if (state.phase !== 'playing' || state.cards?.step !== 'reveal' || state.round !== round) return host
  return nextCardRound(host, rules, now, activeIds)
}

// Någon har kommit eller gått. Nya spelare får en hand och hamnar sist i domarordningen. Är för få
// kvar slutar matchen. Har domaren gått tar nästa i ordningen över.
export function cardPresence(
  host: CardHost,
  rules: CardGameRules,
  activeIds: readonly string[],
  now: number,
  random: Random = Math.random,
): CardHost {
  if (host.state.phase !== 'playing' || !host.state.cards) return host
  let next = dealNewcomers(host, rules)
  const table = next.state.cards!

  const minPlayers = findGame(next.state.game)?.minPlayers ?? 3
  if (table.order.filter((id) => activeIds.includes(id)).length < minPlayers) return finish(next)

  if (!activeIds.includes(table.judge) && table.step !== 'reveal') next = replaceJudge(next, rules, activeIds, now)
  if (next.state.cards!.step === 'choosing' && everyoneDone(next, activeIds)) {
    return toJudging(next, rules, now, random)
  }
  return next
}

function dealNewcomers(host: CardHost, rules: CardGameRules): CardHost {
  const { state, secrets } = host
  const table = state.cards!
  const newcomers = Object.keys(state.players).filter((id) => !table.order.includes(id))
  if (newcomers.length === 0) return host
  let answerPile = secrets.answerPile
  const hands = { ...secrets.hands }
  const blank = { ...secrets.blank }
  for (const id of newcomers) {
    const dealt = draw(answerPile, rules.handSize)
    hands[id] = dealt.drawn
    answerPile = dealt.pile
    blank[id] = true
  }
  return {
    state: { ...state, cards: { ...table, order: [...table.order, ...newcomers] } },
    secrets: { ...secrets, answerPile, hands, blank },
  }
}

// Nästa i ordningen blir domare. Hade den valt eller spelat ett kort får den tillbaka det.
function replaceJudge(host: CardHost, rules: CardGameRules, activeIds: readonly string[], now: number): CardHost {
  const { state, secrets } = host
  const table = state.cards!
  const judge = nextJudge(table.order, table.judge, activeIds)
  if (judge === table.judge) return host

  const picks = { ...secrets.picks }
  delete picks[judge]
  const cards: CardTable = {
    ...table,
    judge,
    chosen: table.chosen.filter((id) => id !== judge),
    done: table.done.filter((id) => id !== judge),
  }
  const next: CardHost = { state: { ...state, cards }, secrets: { ...secrets, picks } }
  if (table.step !== 'judging') return next

  // Domaren valde vinnare: den nya domarens eget kort tas bort, och domaren får full tid.
  const key = Object.keys(secrets.submitted).find((k) => secrets.submitted[k].player === judge)
  if (key === undefined) {
    return { ...next, state: { ...next.state, deadline: now + rules.seconds.judging * 1000 } }
  }
  const { pick } = secrets.submitted[key]
  const submitted = { ...secrets.submitted }
  delete submitted[key]
  const hands = pick.kind === 'card' ? { ...secrets.hands, [judge]: [...secrets.hands[judge], pick.card] } : secrets.hands
  const blank = pick.kind === 'blank' ? { ...secrets.blank, [judge]: true } : secrets.blank
  const withoutJudge: CardHost = {
    state: {
      ...next.state,
      deadline: now + rules.seconds.judging * 1000,
      cards: { ...cards, submissions: cards.submissions.filter((s) => s.key !== key) },
    },
    secrets: { ...next.secrets, hands, blank, submitted },
  }
  return Object.keys(submitted).length < 2 ? skipRound(withoutJudge, rules, now) : withoutJudge
}
