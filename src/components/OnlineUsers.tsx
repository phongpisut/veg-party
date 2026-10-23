import { AnimatePresence, motion } from 'framer-motion'
import { GlowCard } from './ui'
import type { User } from '../types'

export default function OnlineUsers({ users }: { users: Map<string, User> }) {
  const list = [...users.values()]
  return (
    <GlowCard className="p-4">
      <h3 className="text-lg">
        <span className="marker">👋 Online · {list.length}</span>
      </h3>
      <div className="mt-3 space-y-2">
        {list.length === 0 && <p className="text-sm text-slate-500">Nobody here yet…</p>}
        <AnimatePresence initial={false}>
          {list.map((u) => (
            <motion.div
              key={u.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-[#fde68a]/40"
            >
              <motion.span className="text-xl" whileHover={{ rotate: [0, -20, 20, 0], scale: 1.3 }}>
                {u.emoji}
              </motion.span>
              <span className="truncate">{u.name}</span>
              <span className="ml-auto h-2.5 w-2.5 rounded-full border-2 border-[color:var(--ink)] bg-[#1fa65a]" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GlowCard>
  )
}
