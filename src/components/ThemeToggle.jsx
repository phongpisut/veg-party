import { motion } from 'framer-motion'

export default function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark'
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="relative inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 p-2.5 text-lg shadow-sm transition hover:scale-105 dark:border-white/15 dark:bg-white/10"
    >
      <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
        {dark ? '🌙' : '☀️'}
      </motion.span>
    </button>
  )
}
