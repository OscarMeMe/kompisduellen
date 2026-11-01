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

// Identitet per lobby. Spelar-id:t ligger bara i fliken (sessionStorage), så en ny flik eller en omstartad
// webbläsare blir annars en ny spelare. Därför sparas också vilket id man hade i varje lobby i localStorage,
// så att man kan välja att fortsätta som samma spelare (och behålla poängen). Namnet är aldrig identiteten.
const LOBBY_IDENTITY_PREFIX = 'kd-lobby-id:'
// Lobbyer finns bara så länge värden är kvar, så gamla identiteter rensas bort.
const LOBBY_IDENTITY_MAX_AGE_MS = 12 * 60 * 60 * 1000

type SavedIdentity = Player & { at: number }

// Tolkar en sparad identitet. null om den är trasig eller för gammal.
export function parseLobbyIdentity(raw: string | null, now: number): Player | null {
  if (!raw) return null
  try {
    const saved = JSON.parse(raw) as Partial<SavedIdentity>
    if (!saved.id || !saved.name || !saved.avatar || typeof saved.at !== 'number') return null
    if (now - saved.at > LOBBY_IDENTITY_MAX_AGE_MS) return null
    return { id: saved.id, name: saved.name, avatar: saved.avatar }
  } catch {
    return null
  }
}

export function loadLobbyIdentity(code: string): Player | null {
  return parseLobbyIdentity(safeGet('local', LOBBY_IDENTITY_PREFIX + code), Date.now())
}

// Sparar vem jag är i lobbyn. Har någon annan identitet redan sparats (t.ex. i en annan flik) behålls den,
// så att "Fortsätt som" fortsätter peka på den första spelaren.
export function rememberLobbyIdentity(code: string, player: Player) {
  const saved = loadLobbyIdentity(code)
  if (saved && saved.id !== player.id) return
  safeSet('local', LOBBY_IDENTITY_PREFIX + code, JSON.stringify({ ...player, at: Date.now() } satisfies SavedIdentity))
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(LOBBY_IDENTITY_PREFIX) && !parseLobbyIdentity(localStorage.getItem(key), Date.now())) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // Blockerad lagring: då finns inget att rensa.
  }
}

export function forgetLobbyIdentity(code: string) {
  try {
    localStorage.removeItem(LOBBY_IDENTITY_PREFIX + code)
  } catch {
    // Blockerad lagring: då fanns inget sparat heller.
  }
}

// Har den här fliken redan valt vem den är i lobbyn? Då frågar vi inte igen vid omladdning.
export function hasJoinedInThisTab(code: string): boolean {
  return safeGet('session', `kd-joined:${code}`) === '1'
}

// Fliken minns också vem den är i lobbyn. Namnet i webbläsaren (localStorage) delas av alla flikar, så utan
// det kunde en andra person i samma webbläsare döpa om den första vid omladdning.
export function markJoinedInThisTab(code: string, player?: Player) {
  safeSet('session', `kd-joined:${code}`, '1')
  if (player) safeSet('session', `kd-me:${code}`, JSON.stringify(player))
}

export function loadPlayerInThisTab(code: string): Player | null {
  try {
    const saved = JSON.parse(safeGet('session', `kd-me:${code}`) ?? 'null') as Partial<Player> | null
    return saved?.id && saved.name && saved.avatar ? { id: saved.id, name: saved.name, avatar: saved.avatar } : null
  } catch {
    return null
  }
}

// "Fortsätt som": fliken tar över en tidigare spelares id.
export function adoptPlayer(player: Player): Player {
  memoryId = player.id
  safeSet('session', PLAYER_ID_KEY, player.id)
  return player
}

// "Gå med som en annan spelare": fliken får ett nytt id.
export function startNewIdentity() {
  memoryId = crypto.randomUUID()
  safeSet('session', PLAYER_ID_KEY, memoryId)
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

// Förvalt namn och figur för den som testar direkt utan att ha skrivit något (Testa själv).
export function defaultGuest(random: () => number = Math.random): { name: string; avatar: string } {
  return { name: 'Gäst', avatar: AVATARS[Math.floor(random() * AVATARS.length)] }
}

// Spelaren som är sparad i webbläsaren, eller en förvald gäst som sparas så att den går att ändra senare.
export function loadOrCreateGuest(): Player {
  const saved = loadPlayer()
  if (saved) return saved
  const guest = defaultGuest()
  return savePlayer(guest.name, guest.avatar)
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

// Förval från tillfället på startsidan: sitter ni tillsammans? Läses av värdens lobby när den skapas.
export function saveLobbyPreset(code: string, aloud: boolean) {
  safeSet('session', `kd-forval:${code}`, aloud ? '1' : '0')
}

export function lobbyPreset(code: string): { aloud: boolean } | null {
  const saved = safeGet('session', `kd-forval:${code}`)
  return saved === null ? null : { aloud: saved === '1' }
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

// En flik som kopierats från värdens flik ärver värdrollen. Den här fliken ska vara en vanlig spelare.
export function leaveHostRole(code: string) {
  try {
    sessionStorage.removeItem(`kd-host:${code}`)
    sessionStorage.removeItem(`kd-lobby:${code}`)
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
