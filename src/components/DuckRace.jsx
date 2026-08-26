import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { GlowCard, ShimmerButton, GradientText, Sparkles } from './ui'
import { DURATION, speedNow, buildRaceTables, positionAt, duckLabel } from '../gameState'

function useElapsed(startAt, endAt, running) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!running) {
      setElapsed(0)
      return
    }
    let raf
    const loop = () => {
      const now = Date.now()
      setElapsed(Math.min(DURATION, Math.max(0, (now - startAt) / 1000)))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, startAt])
  return elapsed
}

export default function DuckRace({ race, me, canStart, onHostRace, onStart }) {
  const isHost = race.hostId === me.id
  const running = race.status === 'racing'
  const elapsed = useElapsed(race.startAt, race.endAt, running)
  const remaining = () => Math.max(0, (race.startAt + DURATION * 1000 - Date.now()) / 1000)

  const { tables, finish } = useMemo(() => buildRaceTables(race.ducks), [race.ducks])

  const [editing, setEditing] = useState('')

  const ranking = race.status === 'finished' ? race.ranking : null

  function handleHost() {
    const names = editing.split(',').map((n) => n.trim()).filter(Boolean)
    if (names.length >= 2) onHostRace(names)
  }

  return (
    <GlowCard className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          <GradientText>🦆 Duck Race</GradientText>
        </h2>
        <StatusBadge race={race} remaining={remaining} />
      </div>

      {race.status === 'idle' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-300">
            Host a race: give 2+ duck names separated by commas. Every client races
            the same 10s race — each duck gets a random speed condition, and the
            positions are computed locally.
          </p>
          <input
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none"
            placeholder="Quacky, Splash, Waddle, Ducky"
          />
          <ShimmerButton onClick={handleHost}>Create the Race →</ShimmerButton>
        </div>
      )}

      {race.status === 'lobby' && (
        <div className="mt-4">
          <Preview ducks={race.ducks} />
          <div className="mt-4 text-center">
            {isHost ? (
              <>
                <p className="mb-2 text-sm text-amber-200">You are the host.</p>
                <ShimmerButton onClick={onStart}>Start Race (10s) 🏁</ShimmerButton>
              </>
            ) : (
              <p className="text-sm text-slate-400">
                Waiting for host <b>{race.hostName}</b> to start…
              </p>
            )}
          </div>
        </div>
      )}

      {race.status !== 'idle' && race.status !== 'lobby' && (
        <Track race={race} tables={tables} finish={finish} elapsed={elapsed} hasCountdown={elapsed <= 0 && running} />
      )}

      {race.status === 'finished' && ranking && (
        <Result race={race} ranking={ranking} isHost={isHost} onNewRace={() => onHostRace([])} />
      )}
    </GlowCard>
  )
}

function StatusBadge({ race, remaining }) {
  let text = 'No race'
  if (race.status === 'lobby') text = `Ready · ${race.ducks.length} ducks`
  if (race.status === 'racing') text = `${Math.ceil(remaining())}s left`
  if (race.status === 'finished') text = 'Race over'
  return (
    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tabular-nums">
      {text}
    </span>
  )
}

function Preview({ ducks }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ducks.map((d) => {
        const m = duckLabel(d)
        return (
          <div key={d.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-3xl">🦆</div>
            <div className="mt-1 text-sm font-semibold">{d.name}</div>
            <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: m.color + '33', color: m.color }}>
              {m.label}
            </span>
            <p className="mt-1 hidden text-[10px] text-slate-400 sm:block">{m.desc}</p>
          </div>
        )
      })}
    </div>
  )
}

function Track({ race, tables, finish, elapsed, hasCountdown }) {
  return (
    <div className="relative mt-5">
      <div className="relative overflow-hidden rounded-2xl border border-sky-300/20 bg-gradient-to-b from-[#0c2c4e] to-[#0a2038] px-4 py-3">
        <div className="pointer-events-none absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22><path d=%22M0 20 Q15 10 30 20 T60 20%22 stroke=%22%2338bdf8%22 fill=%22none%22 stroke-width=%221.5%22/></svg>')] animate-[bgpan_1.5s_linear_infinite]" />
        <Sparkles />
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[repeating-linear-gradient(45deg,#fbbf24_0_10px,#0b0b0b_10px_20px)]" />
        <div className="absolute right-2 top-1 text-[10px] font-bold text-amber-300">🏁</div>

        {hasCountdown && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-4xl font-black text-amber-300">
            Get ready…
          </div>
        )}

        <div className="relative space-y-4 py-3">
          {race.ducks.map((d) => {
            const pct = positionAt(d, tables, finish, elapsed)
            const m = duckLabel(d)
            const spd = speedNow(d, elapsed)
            return (
              <div key={d.id} className="relative">
                <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-sky-300/20" />
                <div className="absolute -bottom-0 left-0 right-10 flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">
                    {m.label}
                  </span>
                  <div className="h-1 flex-1 overflow-hidden rounded bg-white/10">
                    <motion.div
                      className="h-full"
                      style={{ background: m.color }}
                      animate={{ width: `${Math.min(100, (spd / 1.7) * 100)}%` }}
                      transition={{ duration: 0.15 }}
                    />
                  </div>
                </div>
                <div className="relative z-10 h-10">
                  <motion.div
                    className="absolute -translate-y-1/2 flex items-center gap-2"
                    style={{ top: '50%' }}
                    animate={{ left: `${pct}%` }}
                    transition={{ type: 'tween', duration: 0.1, ease: 'linear' }}
                  >
                    <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">🦆</span>
                    <span className="whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: m.color + '2a', color: m.color }}>
                      {d.name}
                    </span>
                  </motion.div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>Start</span>
        <span>⏱ {DURATION}s race · speeds + start time broadcast, positions client-calculated</span>
        <span>Finish</span>
      </div>
    </div>
  )
}

function Result({ race, ranking, isHost, onNewRace }) {
  return (
    <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-400/10 p-4">
      <div className="flex items-center gap-2 text-amber-200">
        <span className="text-2xl">🏆</span>
        <span className="font-bold">{ranking[0].name} wins!</span>
      </div>
      <ol className="mt-2 list-inside list-decimal text-sm text-slate-300">
        {ranking.slice(1).map((d) => (
          <li key={d.id}>{d.name}</li>
        ))}
      </ol>
      {isHost && (
        <ShimmerButton className="mt-3 w-full" onClick={onNewRace}>
          Host a New Race
        </ShimmerButton>
      )}
    </div>
  )
}
