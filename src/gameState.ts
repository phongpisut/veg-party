import type { Duck, RaceDuck, WheelItem } from './types'

export const DURATION = 10 // race length in seconds

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const easeInOut = (u: number) => u * u * (3 - 2 * u) // smoothstep
export const randomSpeed = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

export function makeDuck(id: string, name: string, taint = false): Duck {
  return {
    id,
    name,
    taint,
    base: randomSpeed(0.85, 1.05),
    s0: randomSpeed(0.25, 1.35),
    s1: randomSpeed(0.25, 1.55),
  }
}

// Each duck carries its own SPEED CONDITION: start speed, end speed and a
// base strength. These are the only values broadcast; every client integrates
// the exact same curve from the same start time, so positions match without
// ever sending them over the wire.
export function duckLabel(d: Duck): { label: string; color: string; desc: string } {
  const ratio = d.s1 / d.s0
  const avg = (d.s0 + d.s1) / 2
  if (ratio >= 1.4)
    return { label: 'Rocket Finish', color: '#a78bfa', desc: 'slow out of the gate, rockets home' }
  if (ratio <= 0.72)
    return { label: 'Fast Start', color: '#f472b6', desc: 'blasts off, fades at the end' }
  if (avg >= 1.0)
    return { label: 'Steady', color: '#34d399', desc: 'consistent high speed' }
  if (avg <= 0.62)
    return { label: 'Slowpoke', color: '#94a3b8', desc: 'in no hurry' }
  return { label: 'Cruiser', color: '#38bdf8', desc: 'middle of the pack pace' }
}

// Distinct color per duck, assigned by its position in the race (evenly
// spaced hues) so ducks A, B, C, D each get a clearly different color.
// Used for the line under the duck and the label background instead of its
// speed condition.
export function duckColor(i: number, total?: number): string {
  const n = Math.max(1, total || 1)
  const hue = Math.round((360 / n) * i)
  return `hsl(${hue} 70% 55%)`
}

export function speedAt(d: Duck, t: number): number {
  const u = clamp01(t / DURATION)
  return d.base * (d.s0 + (d.s1 - d.s0) * easeInOut(u))
}

const STEPS = DURATION * 100

export function buildPositions(d: Duck): number[] {
  const dt = DURATION / STEPS
  const pos = [0]
  let p = 0
  let prev = speedAt(d, 0)
  for (let i = 1; i <= STEPS; i++) {
    const t = i * dt
    const sp = speedAt(d, t)
    p += ((prev + sp) / 2) * dt
    prev = sp
    pos.push(p)
  }
  return pos
}

export function buildRaceTables(ducks: Duck[]): { tables: Record<string, number[]>; finish: number } {
  const tables: Record<string, number[]> = {}
  let finish = 0
  for (const d of ducks) {
    const tabs = buildPositions(d)
    tables[d.id] = tabs
    if (tabs[tabs.length - 1] > finish) finish = tabs[tabs.length - 1]
  }
  return { tables, finish }
}

export function positionAt(d: Duck, tables: Record<string, number[]>, finish: number, elapsed: number): number {
  // buildPositions advances 0.01s per step (DURATION/STEPS), so index = elapsed*100.
  const steps = Math.min(STEPS, Math.max(0, Math.floor(elapsed * 100)))
  const raw = tables[d.id]?.[steps] ?? 0
  return Math.min(100, (raw / finish) * 100)
}

export function speedNow(d: Duck, elapsed: number): number {
  return speedAt(d, Math.max(0, Math.min(DURATION, elapsed)))
}

// Deterministic winner + ranking from the shared speed conditions.
export function raceResult(ducks: Duck[]): { winner: RaceDuck; ranking: RaceDuck[]; max: number } {
  const finals: RaceDuck[] = ducks.map((d) => ({ ...d, final: buildPositions(d).at(-1) as number }))
  finals.sort((a, b) => b.final - a.final)
  const max = finals[0].final
  return { winner: finals[0], ranking: finals, max }
}

// Deterministic wheel target from a nostr event id so every client lands on the same segment.
export function segmentFromId(id: string, n: number): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % n
}

// Default wheel-of-fortune segments. This is just the starting set — clients can
// customize their own list and sync it to everyone via the `wheel_set` event.
export const DEFAULT_WHEEL: WheelItem[] = [
  { label: '🍀 Lucky', color: '#34d399' },
  { label: '🎁 Gift', color: '#f472b6' },
  { label: '🌸 Bloom', color: '#fbbf24' },
  { label: '💰 Bonus', color: '#38bdf8' },
  { label: '🔥 Hot', color: '#fb7185' },
  { label: '⭐ Star', color: '#a78bfa' },
  { label: '🎈 Pop', color: '#fde047' },
  { label: '💎 Gem', color: '#2dd4bf' },
]

export const randomWheelColor = (): string => `hsl(${Math.floor(Math.random() * 360)} 70% 55%)`
