// Spelarens identitet sparas lokalt i webbläsaren. Ingen inloggning behövs för att spela som gäst.

export type Player = {
  id: string
  name: string
  avatar: string
}

export const AVATARS = ['🦊', '🐸', '🐼', '🦄', '🐙', '🐯', '🐧', '🦖', '🐝', '🐨', '🦉', '🐳']

const PLAYER_KEY = 'kd-player'

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Privat läge eller blockerad lagring: spelet fungerar ändå under sessionen.
  }
}

export function loadPlayer(): Player | null {
  const raw = safeGet(PLAYER_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Player
    if (parsed.id && parsed.name && parsed.avatar) return parsed
  } catch {
    // Trasig data: be om namn igen.
  }
  return null
}

export function savePlayer(name: string, avatar: string): Player {
  const existing = loadPlayer()
  const player: Player = {
    id: existing?.id ?? crypto.randomUUID(),
    name: name.trim().slice(0, 20),
    avatar,
  }
  safeSet(PLAYER_KEY, JSON.stringify(player))
  return player
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

// Den som skapar lobbyn är värd. Det sparas per lobbykod.
export function markAsHost(code: string, gameId: string) {
  safeSet(`kd-host:${code}`, gameId)
}

export function hostedGame(code: string): string | null {
  return safeGet(`kd-host:${code}`)
}
