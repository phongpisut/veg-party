import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GlowCard, GradientText, ShimmerButton } from './ui'
import { segmentFromId } from '../gameState'

const SEGMENTS = [
  { label: '🍀 Lucky', color: '#34d399' },
  { label: '🎁 Gift', color: '#f472b6' },
  { label: '🌸 Bloom', color: '#fbbf24' },
  { label: '💰 Bonus', color: '#38bdf8' },
  { label: '🔥 Hot', color: '#fb7185' },
  { label: '⭐ Star', color: '#a78bfa' },
  { label: '🎈 Pop', color: '#fde047' },
  { label: '💎 Gem', color: '#2dd4bf' },
]

function rotationFor(list) {
  const n = SEGMENTS.length
  let r = 0
  for (const s of list) {
    const i = segmentFromId(s.id, n)
    const center = (i / n) * 360 + 0.5 * (360 / n)
    // target residue that puts this segment's center under the top pointer
    const target = (360 - center) % 360
    // spin from the wheel's CURRENT angle, keeping the residue equal to target
    const delta = 1440 + (target - (r % 360))
    r += delta
  }
  return r
}

function segmentFor(list) {
  if (!list.length) return null
  const n = SEGMENTS.length
  return SEGMENTS[segmentFromId(list[list.length - 1].id, n)]
}

export default function WheelOfFortune({ wheelSpins, me, onSpin }) {
  const n = SEGMENTS.length
  const rotation = rotationFor(wheelSpins)
  const landed = segmentFor(wheelSpins)
  const last = wheelSpins[wheelSpins.length - 1] || null
  // Spins that happened after this client connected (live) animate and get a
  // delayed reveal; historical spins replayed on connect just sit at the final
  // resting position so a newly-joined player never sees an unrelated spin.
  const lastLive = last ? !!last.live : false

  const REVEAL_MS = 2300
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    if (!last) return
    if (!lastLive) {
      setRevealed(true)
      return
    }
    setRevealed(false)
    const t = setTimeout(() => setRevealed(true), REVEAL_MS)
    return () => clearTimeout(t)
  }, [wheelSpins.length, lastLive])

  const spinning = lastLive && last && !revealed

  const cone = `conic-gradient(${SEGMENTS.map(
    (s, i) => `${s.color} ${(i / n) * 360}deg ${((i + 1) / n) * 360}deg`,
  ).join(',')})`

  return (
    <GlowCard className="p-6">
      <h2 className="text-xl font-bold">
        <GradientText>🎡 Wheel of Fortune</GradientText>
      </h2>

      <div className="mt-4 flex flex-col items-center">
        <div className="relative mt-4">
          <div className="pointer-events-none absolute left-1/2 -top-3 z-20 -translate-x-1/2 text-2xl text-amber-300 drop-shadow">
            ▼
          </div>
          <motion.div
            className="relative h-56 w-56 rounded-full border-8 border-amber-300 shadow-[0_0_40px_-8px_rgba(251,191,36,0.8)]"
            style={{ background: cone }}
            animate={{ rotate: rotation }}
            transition={lastLive ? { type: 'spring', stiffness: 45, damping: 14 } : { duration: 0 }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-full">
              {SEGMENTS.map((s, i) => {
                const ang = (i / n) * 360 + 0.5 * (360 / n)
                const rad = (ang * Math.PI) / 180
                return (
                  <span
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-xl drop-shadow"
                    style={{ left: `${50 + 42 * Math.sin(rad)}%`, top: `${50 - 42 * Math.cos(rad)}%` }}
                  >
                    {s.label.split(' ')[0]}
                  </span>
                )
              })}
            </div>
          </motion.div>
        </div>

        <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
          {spinning ? (
            <p className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300">
              <span>Spinning for</span>
              <b>{last.name}</b>
              <span className="inline-block animate-spin">🎡</span>
            </p>
          ) : revealed && landed && last ? (
            <p>
              <b className="text-amber-200">{landed.label}</b> landed for{' '}
              <b>{last.name}</b> {last.emoji}
            </p>
          ) : (
            <p>Everyone sees the same result — values come from the event itself.</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-2xl">{last ? last.emoji : me.emoji}</span>
          <ShimmerButton onClick={onSpin} disabled={spinning}>Spin the Wheel</ShimmerButton>
        </div>
      </div>

      {wheelSpins.length > 0 && (
        <div className="mt-5 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-3 text-sm dark:border-white/10 dark:bg-black/20">
          {[...wheelSpins].reverse().map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span>{s.emoji}</span>
              <span className="font-semibold">{s.name}</span>
              <span className="ml-auto text-slate-500 dark:text-slate-400">
                {SEGMENTS[segmentFromId(s.id, n)].label}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  )
}
