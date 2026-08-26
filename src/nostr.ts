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
// Channel tag. Configurable at build time via the VITE_GAME_TAG env var so each
// deployed environment can have its own isolated room (defaults to the live room).
export const GAME_TAG: string = import.meta.env.VITE_GAME_TAG || 'duck-river-party-v2'

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
    { kinds: [GAME_KIND], '#d': [GAME_TAG] },
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

export async function publish(type: string, body: Record<string, any>): Promise<any> {
  const content = JSON.stringify({ type, ...body })
  const event = finalizeEvent(
    {
      kind: GAME_KIND,
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
