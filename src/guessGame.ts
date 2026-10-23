import type { GuessEvent, GuessGame, Seat } from './types'

export const MAX_ROUNDS = 10
export const STALE_MS = 10 * 60 * 1000 // anyone may clear a game nobody touched for this long
const clampRounds = (r: unknown) => Math.min(MAX_ROUNDS, Math.max(1, Math.round(Number(r)) || 3))

// Round-robin: seat i writes the name for seat i+1.
export function targetOf(g: GuessGame, writerId: string): Seat | null {
  const i = g.seats.findIndex((s) => s.id === writerId)
  return i < 0 ? null : g.seats[(i + 1) % g.seats.length]
}

function advance(g: GuessGame, solved: boolean) {
  const n = g.seats.length
  if (solved) {
    const id = g.seats[g.current].id
    g.solved.push(id)
    g.solvedRound[id] = g.round
  }
  g.turn++
  for (let step = 1; step <= n; step++) {
    const idx = (g.current + step) % n
    if (g.solved.includes(g.seats[idx].id)) continue
    if (idx <= g.current) g.round++ // wrapped around the table
    g.current = idx
    if (g.round > g.rounds) g.phase = 'done'
    return
  }
  g.phase = 'done' // everyone got it
}

// Every client folds the same event log (ordered by the sender's ts) into the
// same game state, so nothing but the actions ever goes over the wire.
export function foldGuess(events: GuessEvent[]): GuessGame | null {
  const sorted = [...events].sort((a, b) => a.body.ts - b.body.ts || (a.id < b.id ? -1 : 1))
  let g: GuessGame | null = null
  for (const { pubkey, body: b } of sorted) {
    if (b.act === 'create') {
      if (g && g.phase !== 'done' && pubkey !== g.hostId && b.ts - g.lastTs < STALE_MS) continue
      g = {
        gameId: b.gameId,
        hostId: pubkey,
        hostName: String(b.hostName ?? ''),
        rounds: clampRounds(b.rounds),
        phase: 'lobby',
        seats: [],
        names: {},
        current: 0,
        round: 1,
        turn: 0,
        solved: [],
        solvedRound: {},
        lastTs: b.ts,
      }
      continue
    }
    if (!g || b.gameId !== g.gameId) continue
    const isHost = pubkey === g.hostId
    switch (b.act) {
      case 'config':
        if (isHost && g.phase === 'lobby') g.rounds = clampRounds(b.rounds)
        break
      case 'sit':
        if (g.phase === 'lobby' && !g.seats.some((s) => s.id === pubkey))
          g.seats.push({ id: pubkey, name: String(b.name ?? '').slice(0, 20), emoji: String(b.emoji ?? '🙂') })
        break
      case 'stand':
        if (g.phase === 'lobby') g.seats = g.seats.filter((s) => s.id !== pubkey)
        break
      case 'start':
        if (isHost && g.phase === 'lobby' && g.seats.length >= 2) g.phase = 'writing'
        break
      case 'name': {
        const name = String(b.name ?? '').trim().slice(0, 40)
        if (g.phase === 'writing' && name && targetOf(g, pubkey)?.id === b.target) {
          g.names[b.target] = name
          if (g.seats.every((s) => g!.names[s.id])) g.phase = 'playing'
        }
        break
      }
      case 'end_turn':
      case 'solved':
        if (g.phase === 'playing' && b.turn === g.turn && (pubkey === g.seats[g.current].id || isHost))
          advance(g, b.act === 'solved')
        break
      case 'close':
        if (isHost || g.phase === 'done' || b.ts - g.lastTs >= STALE_MS) g = null
        continue
    }
    g.lastTs = b.ts
  }
  return g
}
