import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GlowCard, GradientText, ShimmerButton } from './ui'
import { MAX_ROUNDS, STALE_MS, targetOf } from '../guessGame'
import type { GuessGame, Me, Seat } from '../types'

type Act = (act: string, data?: Record<string, unknown>) => void

const NOTE_COLORS = ['#fde047', '#f9a8d4', '#a5b4fc', '#7dd3fc', '#fdba74', '#c4b5fd', '#fca5a5', '#5eead4']
const HOLD_SECONDS = 1.4

// Press and hold to confirm, so a stray tap can't end your game.
function HoldButton({ onDone, children }: { onDone: () => void; children: React.ReactNode }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const start = () => {
    if (timer.current) return
    setHolding(true)
    timer.current = setTimeout(() => {
      stop()
      onDone()
    }, HOLD_SECONDS * 1000)
  }
  const stop = () => {
    clearTimeout(timer.current)
    timer.current = undefined
    setHolding(false)
  }
  useEffect(() => stop, [])
  return (
    <motion.button
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && start()}
      onKeyUp={stop}
      onContextMenu={(e) => e.preventDefault()}
      animate={holding ? { scale: 0.96, x: [0, -2, 2, -2, 0] } : { scale: 1, x: 0 }}
      transition={holding ? { x: { repeat: Infinity, duration: 0.25 } } : {}}
      className="sketch-btn btn-green relative select-none overflow-hidden px-6 py-3 text-xl touch-none"
    >
      <motion.span
        className="absolute inset-0 origin-left bg-[repeating-linear-gradient(-45deg,rgba(35,32,28,0.25)_0_4px,transparent_4px_9px)]"
        initial={false}
        animate={{ scaleX: holding ? 1 : 0 }}
        transition={{ duration: holding ? HOLD_SECONDS : 0.25, ease: 'linear' }}
      />
      <span className="relative">{holding ? 'Keep holding…' : children}</span>
    </motion.button>
  )
}

function Burst() {
  const bits = useRef(
    [...Array(28)].map((_, i) => ({
      i,
      a: (i / 28) * Math.PI * 2,
      d: 120 + Math.random() * 140,
      e: ['🎉', '✨', '🥳', '⭐', '🎊'][i % 5],
    })),
  ).current
  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
      {bits.map((b) => (
        <motion.span
          key={b.i}
          className="absolute text-2xl"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: Math.cos(b.a) * b.d, y: Math.sin(b.a) * b.d + 60, opacity: 0, scale: 1.3, rotate: 360 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        >
          {b.e}
        </motion.span>
      ))}
    </div>
  )
}

function SeatView({
  seat,
  index,
  angle,
  game,
  meId,
}: {
  seat: Seat
  index: number
  angle: number
  game: GuessGame
  meId: string
}) {
  const isMe = seat.id === meId
  const solved = game.solved.includes(seat.id)
  const active = game.phase === 'playing' && game.seats[game.current]?.id === seat.id
  const secret = game.names[seat.id]
  const revealed = game.phase === 'done' || solved || !isMe
  const wroteTheirs = game.phase === 'writing' && !!game.names[targetOf(game, seat.id)?.id ?? '']
  const x = 50 + 41 * Math.cos(angle)
  const y = 50 + 36 * Math.sin(angle)

  return (
    <motion.div
      className="absolute w-24 sm:w-28"
      style={{ x: '-50%', y: '-50%', zIndex: Math.round(y) }}
      initial={{ opacity: 0, left: `${x}%`, top: `${y}%` }}
      animate={{ opacity: 1, left: `${x}%`, top: `${y}%` }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 160, damping: 20 }}
    >
      {/* drop into the chair */}
      <motion.div
        className="flex flex-col items-center"
        initial={{ y: -80, scale: 0.6, rotate: -20 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 12 }}
      >
      {/* the sticky note on their forehead */}
      <AnimatePresence>
        {secret !== undefined && (
          <motion.div
            initial={{ rotateY: 90, y: 10, opacity: 0 }}
            animate={{ rotateY: 0, y: 0, opacity: 1, rotate: index % 2 ? 4 : -4 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 * index }}
            className="mb-1 max-w-full truncate border-2 border-[#23201c] px-2 py-0.5 text-center text-sm text-[#23201c] shadow-[2px_2px_0_#23201c]"
            style={{ background: solved ? '#4ade80' : NOTE_COLORS[index % NOTE_COLORS.length] }}
          >
            {revealed ? secret : '❓ ???'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {active && (
          <>
            {/* dashed marker circle; transform-only so it stays cheap on phones */}
            <motion.span
              className="absolute -inset-2.5 rounded-full border-[3px] border-dashed border-[#e4572e]"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
            />
            <motion.span
              className="absolute -left-6 top-0 text-lg"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              🎤
            </motion.span>
          </>
        )}
        {/* chair back */}
        <div className="absolute -bottom-2 left-1/2 h-8 w-14 -translate-x-1/2 rounded-t-2xl border-2 border-[color:var(--ink)] bg-[#c08552]" />
        <motion.div
          className={`relative grid h-14 w-14 place-items-center rounded-full border-[2.5px] border-[color:var(--ink)] text-3xl sm:h-16 sm:w-16 sm:text-4xl ${
            isMe ? 'bg-[#fde68a]' : 'bg-[color:var(--card)]'
          }`}
          animate={active ? { y: [0, -4, 0] } : { y: 0 }}
          transition={active ? { repeat: Infinity, duration: 0.9 } : {}}
        >
          {seat.emoji}
          {solved && (
            <motion.span
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              className="absolute -right-1 -top-1 text-xl"
            >
              {game.solved.indexOf(seat.id) === 0 ? '👑' : '✅'}
            </motion.span>
          )}
          {wroteTheirs && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -right-1 -top-1 text-lg">
              ✍️
            </motion.span>
          )}
        </motion.div>
      </div>
      <span
        className={`mt-2 max-w-full truncate rounded-md border-2 border-[color:var(--ink)] px-2 text-sm leading-5 ${
          isMe ? 'btn-red' : 'bg-[color:var(--card)]'
        }`}
      >
        {isMe ? `${seat.name} (you)` : seat.name}
      </span>
      </motion.div>
    </motion.div>
  )
}

function RoundsStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn = 'sketch-btn btn-yellow grid h-8 w-8 place-items-center text-lg disabled:opacity-30'
  return (
    <div className="flex items-center gap-2 text-lg">
      <span>Rounds</span>
      <button className={btn} disabled={value <= 1} onClick={() => onChange(value - 1)} aria-label="Fewer rounds">
        −
      </button>
      <motion.span key={value} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="w-6 text-center text-lg font-bold">
        {value}
      </motion.span>
      <button className={btn} disabled={value >= MAX_ROUNDS} onClick={() => onChange(value + 1)} aria-label="More rounds">
        +
      </button>
    </div>
  )
}

export default function GuessWho({ game, me, onAct }: { game: GuessGame | null; me: Me; onAct: Act }) {
  const [rounds, setRounds] = useState(3)
  const [draft, setDraft] = useState('')
  const [burst, setBurst] = useState(0)

  // confetti when someone (live) guesses right
  const solvedCount = game?.solved.length ?? 0
  const prevSolved = useRef(solvedCount)
  useEffect(() => {
    if (game && solvedCount > prevSolved.current && Date.now() - game.lastTs < 5000) setBurst((b) => b + 1)
    prevSolved.current = solvedCount
  }, [solvedCount])

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-bold">
        <GradientText>🕵️ Who Am I?</GradientText>
      </h2>
      {game && game.phase !== 'lobby' && (
        <motion.span
          key={`${game.phase}-${game.round}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-md border-2 border-[color:var(--ink)] bg-[#fde68a] px-2 text-[#23201c]"
        >
          {game.phase === 'writing' && '✍️ Writing names'}
          {game.phase === 'playing' && `Round ${game.round} / ${game.rounds}`}
          {game.phase === 'done' && '🏁 Game over'}
        </motion.span>
      )}
    </div>
  )

  if (!game) {
    return (
      <GlowCard className="p-6">
        {header}
        <p className="mt-3 opacity-80">
          Everyone sits at the table and secretly writes a famous name for the player on their left. You see everyone's
          name except your own — ask yes/no questions on your turn to figure out who you are!
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <RoundsStepper value={rounds} onChange={setRounds} />
          <ShimmerButton
            disabled={!me.name}
            onClick={() => onAct('create', { gameId: `${me.id.slice(0, 8)}-${Date.now()}`, rounds, hostName: me.name })}
          >
            🪑 Set up the table
          </ShimmerButton>
        </div>
      </GlowCard>
    )
  }

  const isHost = game.hostId === me.id
  const mySeatIdx = game.seats.findIndex((s) => s.id === me.id)
  const seated = mySeatIdx >= 0
  const n = game.seats.length
  // rotate the table so you always sit at the bottom
  const angleOf = (i: number) => Math.PI / 2 + ((i - Math.max(0, mySeatIdx)) / Math.max(1, n)) * Math.PI * 2
  const current = game.seats[game.current]
  const myTurn = game.phase === 'playing' && current?.id === me.id
  const target = seated ? targetOf(game, me.id) : null
  const iWrote = !!(target && game.names[target.id])
  const stale = Date.now() - game.lastTs > STALE_MS

  function submitName(e: FormEvent) {
    e.preventDefault()
    if (target && draft.trim()) {
      onAct('name', { target: target.id, name: draft.trim() })
      setDraft('')
    }
  }

  const ranking = [...game.solved, ...game.seats.map((s) => s.id).filter((id) => !game.solved.includes(id))]

  return (
    <GlowCard className="p-6">
      {header}

      {/* the table */}
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-xl sm:aspect-[16/10]">
        <div className="absolute inset-[24%_20%] rounded-[50%] border-[3px] border-[color:var(--ink)] bg-[#9fd49a] shadow-[6px_6px_0_var(--ink)]" />
        <div className="absolute inset-[24%_20%] grid place-items-center p-2 text-center text-base leading-tight text-[#23201c] sm:text-lg">
          <AnimatePresence mode="wait">
            <motion.div key={`${game.phase}-${game.turn}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {game.phase === 'lobby' && (n ? `${n} seated · waiting for ${game.hostName || 'host'}` : 'Pull up a chair!')}
              {game.phase === 'writing' && `${Object.keys(game.names).length} / ${n} names written`}
              {game.phase === 'playing' && current && (
                <>
                  <div className="text-2xl">{current.emoji}</div>
                  {current.id === me.id ? 'Your turn — ask away!' : `${current.name} is asking…`}
                </>
              )}
              {game.phase === 'done' && '🎉 Names revealed!'}
            </motion.div>
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {game.seats.map((s, i) => (
            <SeatView key={s.id} seat={s} index={i} angle={angleOf(i)} game={game} meId={me.id} />
          ))}
        </AnimatePresence>
        <AnimatePresence>{burst > 0 && <Burst key={burst} />}</AnimatePresence>
      </div>

      {/* controls */}
      <div className="mt-4 flex flex-col items-center gap-3">
        {game.phase === 'lobby' && (
          <>
            <div className="flex flex-wrap justify-center gap-3">
              {seated ? (
                <motion.button onClick={() => onAct('stand')} className="sketch-btn btn-yellow px-4 py-2 text-lg">
                  🚶 Stand up
                </motion.button>
              ) : (
                <ShimmerButton disabled={!me.name} onClick={() => onAct('sit', { name: me.name, emoji: me.emoji })}>
                  🪑 Sit down
                </ShimmerButton>
              )}
              {isHost && (
                <ShimmerButton disabled={n < 2} onClick={() => onAct('start')}>
                  ▶ Start ({n})
                </ShimmerButton>
              )}
            </div>
            {isHost ? (
              <RoundsStepper value={game.rounds} onChange={(r) => onAct('config', { rounds: r })} />
            ) : (
              <p className="opacity-70">{game.rounds} rounds · host: {game.hostName}</p>
            )}
          </>
        )}

        {game.phase === 'writing' &&
          (target && !iWrote ? (
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onSubmit={submitName} className="w-full max-w-md text-center">
              <p className="text-lg">
                Write a name for <b>{target.emoji} {target.name}</b> 🤫
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  value={draft}
                  maxLength={40}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="e.g. Taylor Swift"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 focus:border-[color:var(--ink)] focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
                />
                <ShimmerButton disabled={!draft.trim()}>Stick it 📝</ShimmerButton>
              </div>
            </motion.form>
          ) : (
            <p className="opacity-70">{seated ? 'Done! Waiting for the others to write…' : 'Players are writing names…'}</p>
          ))}

        {game.phase === 'playing' &&
          (myTurn ? (
            <div className="flex flex-wrap justify-center gap-3">
              <motion.button
                onClick={() => onAct('end_turn', { turn: game.turn })}
                className="sketch-btn btn-ink px-6 py-3 text-xl"
              >
                ⏭ End turn
              </motion.button>
              <HoldButton onDone={() => onAct('solved', { turn: game.turn })}>🎯 Hold: I got it!</HoldButton>
            </div>
          ) : (
            <div className="text-center opacity-80">
              {seated && game.solved.includes(me.id) && (
                <p className="mb-1">
                  You were <b className="marker">{game.names[me.id]}</b> 🎉
                </p>
              )}
              {isHost && (
                <button onClick={() => onAct('end_turn', { turn: game.turn })} className="text-sm underline decoration-wavy">
                  Skip {current?.name}'s turn
                </button>
              )}
            </div>
          ))}

        {game.phase === 'done' && (
          <div className="w-full max-w-md space-y-2">
            {ranking.map((id, i) => {
              const s = game.seats.find((x) => x.id === id)!
              const won = game.solved.includes(id)
              return (
                <motion.div
                  key={id}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 border-b-2 border-dashed border-[color:var(--ink)] px-1 py-1.5"
                >
                  <span className="w-6 text-center">{won ? ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.` : '💤'}</span>
                  <span className="text-xl">{s.emoji}</span>
                  <span>{s.name}</span>
                  <span className="ml-auto truncate">
                    was <b>{game.names[id]}</b>
                    {won && <span className="text-sm opacity-60"> · round {game.solvedRound[id]}</span>}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}

        {(isHost || stale || game.phase === 'done') && (
          <div className="flex items-center gap-3">
            {game.phase === 'done' && (
              <ShimmerButton onClick={() => onAct('create', { gameId: `${me.id.slice(0, 8)}-${Date.now()}`, rounds: game.rounds, hostName: me.name })}>
                🔁 Play again
              </ShimmerButton>
            )}
            <button onClick={() => onAct('close')} className="underline decoration-wavy opacity-70">
              Close table
            </button>
          </div>
        )}
      </div>
    </GlowCard>
  )
}
