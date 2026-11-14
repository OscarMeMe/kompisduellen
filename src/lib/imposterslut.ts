// Slutskärmen "Fallet avslutat" i Imposterjakten: omgångarna som en akt, utmärkelserna, matchens siffror och raden om
// hur vinsten kom till. Rena funktioner som läser matchens historik (imposterMatch.history), som fylls på i facit, när
// allt redan är offentligt.

import type { ImposterRound } from '@/lib/imposterjakten'

export type ImposterAwardId = 'bluffare' | 'sparhund' | 'syndabock' | 'tankelasare' | 'blaogd'

export type ImposterAward = {
  id: ImposterAwardId
  title: string
  // De som fick den. Lika många ger en delad utmärkelse.
  ids: string[]
  // Vad de gjorde, t.ex. "Kom undan 2 gånger".
  what: string
}

// Högst så här många utmärkelser visas.
export const MAX_AWARDS = 3

const times = (n: number) => `${n} ${n === 1 ? 'gång' : 'gånger'}`

// Hur en omgång slutade, i ett par ord.
export function outcomeText(round: Pick<ImposterRound, 'kind'>): string {
  if (round.kind === 'undan') return 'kom undan'
  if (round.kind === 'gissade-ratt') return 'fångad, gissade rätt'
  if (round.kind === 'gissade-fel') return 'fångad, gissade fel'
  return 'fångad, gav upp'
}

// Fångades impostern i omgången?
const caught = (round: ImposterRound) => round.kind !== 'undan'

// Det spelaren gjorde under matchen.
type Tally = {
  // Kom undan som imposter.
  escapes: number
  // Omgångar som oskyldig där spelaren röstade, och hur många av rösterna som var på impostern.
  votes: number
  right: number
  // Röster spelaren fick som oskyldig.
  blamed: number
  // Ord spelaren gissade rätt som imposter.
  guessed: string[]
}

function tally(history: readonly ImposterRound[], players: readonly string[]): Record<string, Tally> {
  const all: Record<string, Tally> = Object.fromEntries(players.map((id) => [id, { escapes: 0, votes: 0, right: 0, blamed: 0, guessed: [] }]))
  for (const round of history) {
    const imposter = all[round.imposter]
    if (imposter && round.kind === 'undan') imposter.escapes += 1
    if (imposter && round.kind === 'gissade-ratt') imposter.guessed.push(round.word)
    for (const [voter, target] of Object.entries(round.votes)) {
      const one = all[voter]
      if (one && voter !== round.imposter) {
        one.votes += 1
        if (target === round.imposter) one.right += 1
      }
      const blamed = all[target]
      if (blamed && target !== round.imposter) blamed.blamed += 1
    }
  }
  return all
}

// De med högst värde (minst min), eller ingen.
function leaders(all: Record<string, Tally>, value: (one: Tally) => number, min = 1): { ids: string[]; best: number } | null {
  const ids = Object.keys(all)
  const best = Math.max(0, ...ids.map((id) => value(all[id])))
  if (best < min) return null
  return { ids: ids.filter((id) => value(all[id]) === best), best }
}

// Utmärkelserna, bara de som någon faktiskt fått, högst tre, i den här ordningen: Mästerbluffaren (kom undan flest
// gånger), Spårhunden (röstade på impostern flest gånger), Syndabocken (den oskyldiga som fick flest röster),
// Tankeläsaren (impostern som gissade ordet) och Blåögd (röstade fel flest gånger, minst två). players = de som var med
// i matchen. Vid lika delas utmärkelsen.
export function imposterAwards(history: readonly ImposterRound[], players: readonly string[]): ImposterAward[] {
  const all = tally(history, players)
  const awards: ImposterAward[] = []

  const bluff = leaders(all, (one) => one.escapes)
  if (bluff) awards.push({ id: 'bluffare', title: 'Mästerbluffaren', ids: bluff.ids, what: `Kom undan ${times(bluff.best)}` })

  const hound = leaders(all, (one) => one.right)
  if (hound) {
    // "Rätt 3 av 4" när alla som delar den röstade lika många gånger, annars bara antalet.
    const of = new Set(hound.ids.map((id) => all[id].votes))
    awards.push({ id: 'sparhund', title: 'Spårhunden', ids: hound.ids, what: of.size === 1 ? `Rätt ${hound.best} av ${[...of][0]}` : `Rätt ${times(hound.best)}` })
  }

  const scapegoat = leaders(all, (one) => one.blamed)
  if (scapegoat) {
    awards.push({ id: 'syndabock', title: 'Syndabocken', ids: scapegoat.ids, what: `${scapegoat.best} ${scapegoat.best === 1 ? 'röst' : 'röster'}, helt oskyldig` })
  }

  const reader = leaders(all, (one) => one.guessed.length)
  if (reader) {
    const words = all[reader.ids[0]].guessed
    awards.push({
      id: 'tankelasare',
      title: 'Tankeläsaren',
      ids: reader.ids,
      what: reader.ids.length === 1 && words.length === 1 ? `Gissade ${words[0]}` : `Gissade rätt ${times(reader.best)}`,
    })
  }

  const naive = leaders(all, (one) => one.votes - one.right, 2)
  if (naive) {
    const of = new Set(naive.ids.map((id) => all[id].votes))
    awards.push({ id: 'blaogd', title: 'Blåögd', ids: naive.ids, what: of.size === 1 ? `Fel ${naive.best} av ${[...of][0]}` : `Fel ${times(naive.best)}` })
  }

  return awards.slice(0, MAX_AWARDS)
}

// Matchens siffror: omgångar, hur ofta impostern fångades och rösterna på fel person.
export type ImposterStats = { rounds: number; caught: number; wrongVotes: number }

export function imposterStats(history: readonly ImposterRound[]): ImposterStats {
  return {
    rounds: history.length,
    caught: history.filter(caught).length,
    wrongVotes: history.reduce((sum, round) => sum + Object.entries(round.votes).filter(([voter, target]) => voter !== round.imposter && target !== round.imposter).length, 0),
  }
}

// "5 omgångar · impostern fångad 3 gånger · 11 röster på fel person"
export function imposterStatsLine(stats: ImposterStats): string {
  return [
    `${stats.rounds} ${stats.rounds === 1 ? 'omgång' : 'omgångar'}`,
    `impostern fångad ${times(stats.caught)}`,
    `${stats.wrongVotes} ${stats.wrongVotes === 1 ? 'röst' : 'röster'} på fel person`,
  ].join(' · ')
}

// Raden under vinnarens namn: hur vinsten kom till, i stället för bara poäng. Vid delad seger står poängen.
export function winnerLine(history: readonly ImposterRound[], winners: readonly string[], score: number): string {
  const points = `${score} poäng`
  if (winners.length !== 1) return `Delad seger med ${points}`
  const one = tally(history, winners)[winners[0]]
  if (one.escapes >= 2) return `Kom undan ${times(one.escapes)} · ${points}`
  if (one.votes >= 2 && one.right === one.votes) return `Röstade rätt varje gång · ${points}`
  if (one.escapes === 1) return `Kom undan som imposter · ${points}`
  if (one.guessed.length > 0) return `Gissade ordet som imposter · ${points}`
  if (one.right > 0) return `Röstade rätt ${one.right} av ${one.votes} · ${points}`
  return points
}
