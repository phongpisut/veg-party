import { SimplePool, finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools'

// Primary relay + low-traffic free alternates. Events publish to all and are
// subscribed from all, so any client that shares at least one relay stays in sync.
export const RELAYS = [
  'wss://relay.pocketnostr.com',
  'wss://relay.damus.io',
  'wss://nostr.mom',
]
export const RELAY = RELAYS[0]
export const GAME_KIND = 31337
export const GAME_TAG = 'duck-river-party'

const EVENTS = new EventTarget()
export const on = (type, fn) => {
  const handler = (e) => fn(e.detail)
  EVENTS.addEventListener(type, handler)
  return () => EVENTS.removeEventListener(type, handler)
}
export const emit = (type, payload) => EVENTS.dispatchEvent(new CustomEvent(type, { detail: payload }))

const SK_KEY = 'drp_secret_key'
function loadKey() {
  let hex = localStorage.getItem(SK_KEY)
  if (!hex) {
    const sk = generateSecretKey()
    hex = Array.from(sk).map((b) => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(SK_KEY, hex)
  }
  const bytes = Uint8Array.from(hex.match(/.{2}/g).map((h) => parseInt(h, 16)))
  return { hex, bytes }
}

const { hex: skHex, bytes: skBytes } = loadKey()
export const myPubkey = getPublicKey(skBytes)

const pool = new SimplePool()

export function connect() {
  pool.subscribeMany(
    RELAYS,
    { kinds: [GAME_KIND], '#d': [GAME_TAG] },
    {
      onevent(ev) {
        let body
        try {
          body = JSON.parse(ev.content)
        } catch {
          return
        }
        emit(body.type ?? 'unknown', { id: ev.id, pubkey: ev.pubkey, created_at: ev.created_at, body })
      },
      oneose() {
        emit('connected', { relay: RELAY })
      },
    },
  )
}

export async function publish(type, body) {
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
  emit(type, { id: event.id, pubkey: myPubkey, created_at: event.created_at, body: JSON.parse(content) })
  try {
    await Promise.allSettled(pool.publish(RELAYS, event))
  } catch (err) {
    console.warn('publish failed', err)
  }
  return event
}

export function makeUser(payload, ev) {
  return { id: ev.pubkey, name: payload.name, emoji: payload.emoji, at: ev.created_at }
}
