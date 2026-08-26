import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { GlowCard, ShimmerButton, GradientText } from './ui'

const EMOJIS = ['🦆', '🐸', '🐢', '🦊', '🐻', '🐧', '🦋', '🐳', '🦄', '🐯', '🐙', '🐝', '🐬', '🦜', '🐹', '🐺']

export default function JoinModal({ onSubmit }: { onSubmit: (name: string, emoji: string) => void }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🦆')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), emoji)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}>
        <GlowCard className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="text-5xl mb-2">🦆</div>
            <h2 className="text-2xl font-bold">
              <GradientText>Duck River Party</GradientText>
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Syncs live over Nostr so everyone races the same race.
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunny"
                maxLength={20}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Pick your emoji</label>
              <div className="mt-2 grid grid-cols-8 gap-2">
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`rounded-lg py-1.5 text-2xl transition ${
                      emoji === em
                        ? 'bg-sky-500/40 ring-2 ring-sky-400 scale-110'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <ShimmerButton disabled={!name.trim()} className="w-full">
              Join the Party →
            </ShimmerButton>
          </form>
        </GlowCard>
      </motion.div>
    </motion.div>
  )
}
