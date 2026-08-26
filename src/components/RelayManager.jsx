import { useEffect, useState } from 'react'
import { GlowCard } from './ui'
import * as nostr from '../nostr'

export default function RelayManager() {
  const [relays, setRelays] = useState(nostr.getRelays())
  const [status, setStatus] = useState({})
  const [newUrl, setNewUrl] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setStatus(nostr.relayStatus())
    const off = nostr.on('relay_status', ({ relay, up }) => {
      setStatus((s) => ({ ...s, [relay]: up }))
    })
    return off
  }, [])

  function add() {
    if (nostr.addRelay(newUrl)) {
      setRelays(nostr.getRelays())
      setMsg('Backup relay added & saved to localStorage. Reconnecting…')
      nostr.refreshRelays()
    } else if (!newUrl.trim()) {
      setMsg('Enter a relay URL like wss://example.com')
    } else {
      setMsg('Relay already added or invalid URL.')
    }
    setTimeout(() => setMsg(''), 4000)
  }

  function remove(url) {
    if (!nostr.RELAYS.includes(url)) {
      nostr.removeRelay(url)
      setRelays(nostr.getRelays())
      nostr.refreshRelays()
    }
  }

  return (
    <GlowCard className="p-4">
      <h3 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
        Relays · backup & failover
      </h3>
      <ul className="mt-3 space-y-1.5 text-xs">
        {relays.map((r) => {
          const up = status[r]
          const isDefault = nostr.RELAYS.includes(r)
          return (
            <li key={r} className="flex items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  up ? 'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)]' : 'bg-red-400'
                }`}
              />
              <span className="truncate">{r.replace('wss://', '')}</span>
              {!isDefault && (
                <button onClick={() => remove(r)} className="ml-auto text-red-400 hover:text-red-500">
                  ✕
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="wss://backup-relay.example"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
        />
        <button
          onClick={add}
          className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
        >
          Add backup
        </button>
      </div>
      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
        Events publish to all relays; if one fails the others keep sync going. Added relays are saved to localStorage first.
      </p>
      {msg && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-300">{msg}</p>}
    </GlowCard>
  )
}
