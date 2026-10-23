import { motion } from 'framer-motion'

export default function ThemeToggle({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  const dark = theme === 'dark'
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="sketch-btn btn-yellow relative inline-flex items-center justify-center p-2 text-lg"
    >
      <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
        {dark ? '🌙' : '☀️'}
      </motion.span>
    </button>
  )
}
