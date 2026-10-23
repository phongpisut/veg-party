import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GlowCard } from './ui'
import { ROOM, inviteLink, goToRoom, createRoom, cleanRoom } from '../nostr'

const TILE_COLORS = ['btn-yellow', 'btn-red', 'btn-blue', 'btn-green', 'btn-purple']

export default function RoomCard() {
  const [copied, setCopied] = useState<'' | 'code' | 'link'>('')
  const [code, setCode] = useState('')

  async function copy(what: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(what === 'code' ? ROOM : inviteLink())
      setCopied(what)
      setTimeout(() => setCopied(''), 1600)
    } catch {
      window.prompt('Copy this:', what === 'code' ? ROOM : inviteLink())
    }
  }

  function join(e: FormEvent) {
    e.preventDefault()
    goToRoom(code)
  }

  return (
    <GlowCard className="p-5">
      <h3 className="text-lg"><span className="marker">✉️ Invite code</span></h3>
      <button
        onClick={() => copy('code')}
        title="Copy code"
        className="mt-3 flex w-full justify-center gap-1.5"
      >
        {ROOM.split('').map((ch, i) => (
          <motion.span
            key={i}
            initial={{ y: -20, opacity: 0, rotate: -15 }}
            animate={{ y: 0, opacity: 1, rotate: i % 2 ? 3 : -3 }}
            whileHover={{ y: -4, rotate: i % 2 ? 8 : -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15, delay: i * 0.06 }}
            className={`sketch-btn grid h-12 w-10 place-items-center font-mono text-2xl font-bold ${TILE_COLORS[i % TILE_COLORS.length]}`}
          >
            {ch}
          </motion.span>
        ))}
      </button>

      <button
        onClick={() => copy('link')}
        className="sketch-btn btn-blue relative mt-4 w-full overflow-hidden px-4 py-2 text-lg"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className="block"
          >
            {copied === 'link' ? '✅ Link copied — send it!' : copied === 'code' ? '✅ Code copied' : '🔗 Copy invite link'}
          </motion.span>
        </AnimatePresence>
      </button>

      <form onSubmit={join} className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(cleanRoom(e.target.value))}
          placeholder="Friend's code"
          aria-label="Room code to join"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono uppercase tracking-widest text-slate-800 placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-[color:var(--ink)] focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
        />
        <button
          disabled={!code || code === ROOM}
          className="sketch-btn btn-red px-3 py-1 text-lg disabled:opacity-40"
        >
          Join
        </button>
      </form>
      <button onClick={createRoom} className="mt-2 w-full text-sm underline decoration-wavy underline-offset-4 opacity-70 hover:opacity-100">
        or start a new room
      </button>
    </GlowCard>
  )
}
