import { AnimatePresence, motion } from 'framer-motion'

export default function Toasts({ toasts }) {
  return (
    <div className="fixed right-4 top-20 z-40 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(({ id, user }) => (
          <motion.div
            key={id}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-sm shadow-lg backdrop-blur"
          >
            <span className="text-xl">{user.emoji}</span>
            <span>
              <b className="text-emerald-600 dark:text-emerald-300">{user.name}</b> joined the party
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
