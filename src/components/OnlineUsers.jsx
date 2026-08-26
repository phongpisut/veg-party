import { GlowCard } from './ui'

export default function OnlineUsers({ users }) {
  const list = [...users.values()]
  return (
    <GlowCard className="p-4">
      <h3 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
        Online · {list.length}
      </h3>
      <div className="mt-3 space-y-2">
        {list.length === 0 && <p className="text-sm text-slate-500">Nobody here yet…</p>}
        {list.map((u) => (
          <div key={u.id} className="flex items-center gap-2 text-sm">
            <span className="text-xl">{u.emoji}</span>
            <span className="truncate">{u.name}</span>
            <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)]" />
          </div>
        ))}
      </div>
    </GlowCard>
  )
}
