import { motion } from 'framer-motion'

// A few hand-rolled "magic ui" style primitives (animated gradient text,
// shimmer surfaces, floating sparkles) tuned for light + dark themes.

export function GradientText({ children, className = '' }) {
  return (
    <span
      className={`bg-gradient-to-r from-amber-500 via-pink-500 to-sky-500 dark:from-amber-200 dark:via-pink-300 dark:to-sky-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient_3s_linear_infinite] ${className}`}
    >
      {children}
    </span>
  )
}

export function Sparkles({ count = 14 }) {
  const sparkles = [...Array(count)].map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    dur: 2 + Math.random() * 2,
  }))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {sparkles.map((s) => (
        <motion.span
          key={s.id}
          className="absolute text-amber-400/70 dark:text-yellow-200"
          style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${8 + (s.id % 3) * 4}px` }}
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  )
}

export function GlowCard({ children, className = '' }) {
  return (
    <div
      className={`relative rounded-2xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_10px_40px_-12px_rgba(2,90,150,0.25)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_0_40px_-10px_rgba(56,189,248,0.45)] overflow-hidden ${className}`}
    >
      <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-30 dark:opacity-40 bg-[linear-gradient(120deg,transparent,rgba(56,189,248,0.3),transparent)] bg-[length:200%_200%] animate-[gradient_5s_linear_infinite]" />
      {children}
    </div>
  )
}

export function ShimmerButton({ children, onClick, disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed ${
        disabled
          ? 'bg-slate-400 dark:bg-slate-600'
          : 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 shadow-[0_0_25px_-5px_rgba(34,211,238,0.8)] hover:brightness-110 active:scale-95'
      } ${className}`}
    >
      {children}
    </button>
  )
}
