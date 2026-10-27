// Spelarens identitet sparas lokalt i webbläsaren. Ingen inloggning behövs för att spela som gäst.
// - Namn och figur sparas i localStorage, så att man slipper skriva in dem igen.
// - Spelar-id och värdflaggan sparas i sessionStorage, alltså per flik. Då blir varje flik
//   en egen spelare, och bara fliken som skapade lobbyn är värd.

export type Player = {
  id: string
  name: string
  avatar: string
}

export const AVATARS = ['👻', '👽', '🤖', '👾', '🧙', '🧛', '🧜', '🦸', '🥷', '🤡', '💀', '🎃']

const PROFILE_KEY = 'kd-player'
const PLAYER_ID_KEY = 'kd-player-id'

type StorageKind = 'local' | 'session'

function safeGet(kind: StorageKind, key: string): string | null {
  try {
    return (kind === 'local' ? localStorage : sessionStorage).getItem(key)
  } catch {
    return null
  }
}

function safeSet(kind: StorageKind, key: string, value: string) {
  try {
    const store = kind === 'local' ? localStorage : sessionStorage
    store.setItem(key, value)
  } catch {
    // Privat läge eller blockerad lagring: spelet fungerar ändå under sessionen.
  }
}

// Flikens spelar-id. Skapas första gången det behövs och gäller sedan så länge fliken är öppen.
// Är sessionStorage blockerad finns id:t kvar i minnet tills sidan laddas om.
let memoryId: string | null = null
function playerId(): string {
  const saved = safeGet('session', PLAYER_ID_KEY) ?? memoryId
  if (saved) return saved
  memoryId = crypto.randomUUID()
  safeSet('session', PLAYER_ID_KEY, memoryId)
  return memoryId
}

export function loadPlayer(): Player | null {
  const raw = safeGet('local', PROFILE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Player>
    if (parsed.name && parsed.avatar) return { id: playerId(), name: parsed.name, avatar: parsed.avatar }
  } catch {
    // Trasig data: be om namn igen.
  }
  return null
}

export function savePlayer(name: string, avatar: string): Player {
  const profile = { name: name.trim().slice(0, 20), avatar }
  safeSet('local', PROFILE_KEY, JSON.stringify(profile))
  return { id: playerId(), ...profile }
}

// Bokstäver som är lätta att läsa högt och svåra att blanda ihop (inga I, O, Q osv.).
const CODE_LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'

export function generateLobbyCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
  }
  return code
}

export function normalizeCode(code: string): string {
  return code.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4)
}

// Den som skapar lobbyn är värd. Det sparas per lobbykod i fliken, tillsammans med spelet
// som valdes på startsidan (det är bara förvalt, värden kan byta i väntrummet).
export function markAsHost(code: string, gameId: string) {
  safeSet('session', `kd-host:${code}`, gameId)
}

export function hostedGame(code: string): string | null {
  return safeGet('session', `kd-host:${code}`)
}

// "Testa själv": lobbyn startar en provomgång direkt när värden har anslutit. Sparas i fliken.
export function requestPractice(code: string) {
  safeSet('session', `kd-test:${code}`, '1')
}

export function hasPracticeRequest(code: string): boolean {
  return safeGet('session', `kd-test:${code}`) === '1'
}

// Tas bort när provomgången startar, så att den bara startar en gång.
export function clearPracticeRequest(code: string) {
  try {
    sessionStorage.removeItem(`kd-test:${code}`)
  } catch {
    // Blockerad lagring: då fanns inget sparat heller.
  }
}

// Värden sparar lobbyns tillstånd (och kortspelens hemliga data) i fliken efter varje ändring, så
// att matchen kan fortsätta om värden laddar om sidan. Stängs fliken är lobbyn borta som förut.
export function saveHostLobby(code: string, data: unknown) {
  safeSet('session', `kd-lobby:${code}`, JSON.stringify(data))
}

export function loadHostLobby(code: string): unknown {
  const raw = safeGet('session', `kd-lobby:${code}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
