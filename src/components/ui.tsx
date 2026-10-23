import type { ReactNode } from 'react'

// Hand-drawn "paper sketch" primitives: ink outlines, wobbly corners, flat
// marker colors. Everything is static CSS so phones don't burn frames on it.

export function GradientText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`marker ${className}`}>{children}</span>
}

export function GlowCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sketch relative ${className}`}>{children}</div>
}

export function ShimmerButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`sketch-btn btn-red px-5 py-2 text-lg disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}
