import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GlowCard, GradientText, ShimmerButton } from './ui'
import { segmentFromId, randomWheelColor } from '../gameState'
import type { WheelItem, WheelSpin, Me } from '../types'

function rotationFor(list: WheelSpin[], items: WheelItem[]): number {
  const n = items.length
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

function segmentFor(list: WheelSpin[], items: WheelItem[]): WheelItem | null {
  if (!list.length || !items.length) return null
  return items[segmentFromId(list[list.length - 1].id, items.length)] || null
}

export default function WheelOfFortune({
  wheelSpins,
  items,
  onSetItems,
  me,
  onSpin,
}: {
  wheelSpins: WheelSpin[]
  items: WheelItem[]
  onSetItems: (items: WheelItem[]) => void
  me: Me
  onSpin: () => void
}) {
  const n = Math.max(1, items.length)
  const rotation = rotationFor(wheelSpins, items)
  const landed = segmentFor(wheelSpins, items)
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

  // ---- item customization (shared with every client via onSetItems) ----
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<WheelItem[]>(items)
  useEffect(() => {
    if (!editing) setDraft(items)
  }, [items, editing])

  function updateItem(idx: number, patch: Partial<WheelItem>) {
    setDraft((d) => d.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function removeItem(idx: number) {
    setDraft((d) => (d.length > 2 ? d.filter((_, i) => i !== idx) : d))
  }
  function addItem() {
    setDraft((d) => [...d, { label: '✨ New', color: randomWheelColor() }])
  }
  function saveItems() {
    onSetItems(draft)
    setEditing(false)
  }

  const cone = `conic-gradient(${items
    .map((s, i) => `${s.color} ${(i / n) * 360}deg ${((i + 1) / n) * 360}deg`)
    .join(',')})`

  return (
    <GlowCard className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          <GradientText>🎡 Wheel of Fortune</GradientText>
        </h2>
        <button
          onClick={() => setEditing((e) => !e)}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white/60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
        >
          ✏️ Customize
        </button>
      </div>

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
              {items.map((s, i) => {
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
              <b>{last!.name}</b>
              <span className="inline-block animate-spin">🎡</span>
            </p>
          ) : revealed && landed && last ? (
            <p>
              <b className="text-amber-200">{landed.label}</b> landed for <b>{last.name}</b> {last.emoji}
            </p>
          ) : (
            <p>Everyone sees the same result — values come from the event itself.</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-2xl">{last ? last.emoji : me.emoji}</span>
          <ShimmerButton onClick={onSpin} disabled={spinning}>
            Spin the Wheel
          </ShimmerButton>
        </div>
      </div>

      {editing && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-white/10 dark:bg-black/20">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Edit the wheel items — changes are shared with everyone.
          </p>
          <div className="space-y-2">
            {draft.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={it.color}
                  onChange={(e) => updateItem(i, { color: e.target.value })}
                  className="h-8 w-10 shrink-0 cursor-pointer rounded border border-slate-300 bg-transparent dark:border-white/15"
                />
                <input
                  value={it.label}
                  onChange={(e) => updateItem(i, { label: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-amber-300 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
                  placeholder="emoji Name"
                />
                <button
                  onClick={() => removeItem(i)}
                  disabled={draft.length <= 2}
                  title={draft.length <= 2 ? 'Keep at least 2 items' : 'Remove'}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-rose-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={addItem}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-white/60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
            >
              + Add item
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <ShimmerButton className="!px-3 !py-1.5 !text-xs" onClick={saveItems}>
                Save
              </ShimmerButton>
            </div>
          </div>
        </div>
      )}

      {wheelSpins.length > 0 && (
        <div className="mt-5 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-3 text-sm dark:border-white/10 dark:bg-black/20">
          {[...wheelSpins].reverse().map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span>{s.emoji}</span>
              <span className="font-semibold">{s.name}</span>
              <span className="ml-auto text-slate-500 dark:text-slate-400">
                {items[segmentFromId(s.id, n)]?.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  )
}
