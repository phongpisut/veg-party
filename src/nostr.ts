import { SimplePool, finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools'

// Default free public relays (primary + alternates). Users can add backup
// relays at runtime; those are kept in localStorage and folded in here.
export const RELAYS = [
  'wss://relay.pocketnostr.com',
  'wss://relay.damus.io',
  'wss://nostr.mom',
]
export const RELAY = RELAYS[0]
export const GAME_KIND = 31337
// 31337 is parameterized-replaceable: relays keep only each user's LATEST event
// per room. Game moves must all survive for late joiners to replay them, so
// they go on a regular (stored) kind instead.
export const MOVE_KIND = 7331
// Channel tag = build-time base (VITE_GAME_TAG, one per deployed environment)
// + the room code, so only people sharing the same invite code sync together.
const BASE_TAG: string = import.meta.env.VITE_GAME_TAG || 'duck-river-party-v2'

const ROOM_KEY = 'drp_room'
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L lookalikes
export const cleanRoom = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
const newRoom = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')

// URL ?room= wins (invite links), then the last room this browser was in, else a fresh one
export const ROOM: string =
  cleanRoom(new URLSearchParams(location.search).get('room') || '') ||
  cleanRoom(localStorage.getItem(ROOM_KEY) || '') ||
  newRoom()
localStorage.setItem(ROOM_KEY, ROOM)
{
  const url = new URL(location.href)
  url.searchParams.set('room', ROOM)
  history.replaceState(null, '', url)
}
export const GAME_TAG = `${BASE_TAG}:${ROOM}`
export const inviteLink = () => `${location.origin}${location.pathname}?room=${ROOM}`
export function goToRoom(code: string): void {
  const room = cleanRoom(code)
  if (room && room !== ROOM) location.search = `?room=${room}` // reload: all shared state is per room
}
export const createRoom = () => goToRoom(newRoom())

const EXTRA_KEY = 'drp_extra_relays'
let extraRelays: string[] = []
try {
  extraRelays = JSON.parse(localStorage.getItem(EXTRA_KEY) || '[]') as string[]
} catch {
  extraRelays = []
}
export const getRelays = () => [...RELAYS, ...extraRelays]

export function addRelay(urlRaw: string): boolean {
  const url = urlRaw.trim().replace(/\/$/, '')
  if (!/^wss?:\/\/.+/.test(url) || getRelays().includes(url)) return false
  extraRelays = [...extraRelays, url]
  localStorage.setItem(EXTRA_KEY, JSON.stringify(extraRelays)) // persist before use
  return true
}

export function removeRelay(url: string): void {
  if (extraRelays.includes(url)) {
    extraRelays = extraRelays.filter((u) => u !== url)
    localStorage.setItem(EXTRA_KEY, JSON.stringify(extraRelays))
  }
}

// ---- event bus (shared pub/sub used by App, Calendar, Voting, etc.) ----
const EVENTS = new EventTarget()
export const on = (type: string, fn: (payload: any) => void) => {
  const handler = (e: Event) => fn((e as CustomEvent).detail)
  EVENTS.addEventListener(type, handler)
  return () => EVENTS.removeEventListener(type, handler)
}
export const emit = (type: string, payload: any) =>
  EVENTS.dispatchEvent(new CustomEvent(type, { detail: payload }))

// ---- keys ----
const SK_KEY = 'drp_secret_key'
function loadKey(): { hex: string; bytes: Uint8Array } {
  let hex = localStorage.getItem(SK_KEY)
  if (!hex) {
    const sk = generateSecretKey()
    hex = Array.from(sk)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    localStorage.setItem(SK_KEY, hex)
  }
  const bytes = Uint8Array.from((hex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)))
  return { hex, bytes }
}
const { bytes: skBytes } = loadKey()
export const myPubkey = getPublicKey(skBytes)

// ---- pool with reconnection + per-relay health ----
const status = new Map<string, boolean>()
// nostr-tools types are awkward here (relay param is a WebSocket/string union and
// the Event type is more specific than we need), so we keep the pool loosely typed.
let pool: any = new SimplePool({
  enableReconnect: true,
  onRelayConnectionSuccess: (relay: any) => {
    status.set(String(relay), true)
    emit('relay_status', { relay: String(relay), up: true })
  },
  onRelayConnectionFailure: (relay: any) => {
    status.set(String(relay), false)
    emit('relay_status', { relay: String(relay), up: false })
  },
} as any)
export const relayStatus = () => ({ ...Object.fromEntries(status) })

let sub: { close: () => void } | null = null
export function connect(): void {
  const relays = getRelays()
  sub?.close()
  sub = pool.subscribeMany(
    relays,
    { kinds: [GAME_KIND, MOVE_KIND], '#d': [GAME_TAG] },
    {
      onevent(ev: any) {
        let body
        try {
          body = JSON.parse(ev.content)
        } catch {
          return
        }
        emit(body.type ?? 'unknown', {
          id: ev.id,
          pubkey: ev.pubkey,
          created_at: ev.created_at,
          body,
        })
      },
      oneose() {
        emit('connected', { relay: RELAY })
      },
    },
  )
}

// Rebuild the pool/subscription after adding or removing backup relays.
export function refreshRelays(): void {
  // closing the old pool reconnects fresh against the updated relay list
  pool.close(getRelays())
  pool = new SimplePool({
    enableReconnect: true,
    onRelayConnectionSuccess: (relay: any) => {
      status.set(String(relay), true)
      emit('relay_status', { relay: String(relay), up: true })
    },
    onRelayConnectionFailure: (relay: any) => {
      status.set(String(relay), false)
      emit('relay_status', { relay: String(relay), up: false })
    },
  } as any)
  status.clear()
  connect()
}

export async function publish(type: string, body: Record<string, any>, kind = GAME_KIND): Promise<any> {
  const content = JSON.stringify({ type, ...body })
  const event = finalizeEvent(
    {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', GAME_TAG],
        ['t', type],
      ],
      content,
    },
    skBytes,
  )
  // Apply locally immediately (relay will re-deliver; callers dedupe by id).
  emit(type, {
    id: event.id,
    pubkey: myPubkey,
    created_at: event.created_at,
    body: JSON.parse(content),
  })
  try {
    await Promise.allSettled(pool.publish(getRelays(), event))
  } catch (err) {
    console.warn('publish failed', err)
  }
  return event
}
