import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlowCard, GradientText, ShimmerButton } from './ui'
import { publish, on as onNostr } from '../nostr'
import type { NoteMap } from '../types'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const loadNotes = (): NoteMap => JSON.parse(localStorage.getItem('drp_notes') || '{}')

export default function Calendar() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<Date>(today)
  const [notes, setNotes] = useState<NoteMap>(loadNotes)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)

  // persist to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem('drp_notes', JSON.stringify(notes))
  }, [notes])

  // sync notes over Nostr: last-write-wins by event timestamp
  useEffect(() => {
    const off = onNostr('note_set', (ev) => {
      const { date, text } = ev.body
      const ts = ev.created_at
      setNotes((prev) => {
        const cur = prev[date]
        if (cur && ts < cur.ts) return prev // incoming is older, keep mine
        const next: NoteMap = { ...prev }
        if (text) next[date] = { text, ts }
        else delete next[date]
        return next
      })
    })
    return off
  }, [])

  const selKey = key(selected)
  const selText = notes[selKey]?.text || ''

  function openDay(d: Date) {
    setSelected(d)
    setDraft(notes[key(d)]?.text || '')
    setSaved(false)
  }

  function saveNote() {
    const ts = Math.floor(Date.now() / 1000)
    const text = draft.trim()
    const next: NoteMap = { ...notes }
    if (text) next[selKey] = { text, ts }
    else delete next[selKey]
    // back up to localStorage FIRST, then broadcast so a failed relay never
    // loses the note
    localStorage.setItem('drp_notes', JSON.stringify(next))
    setNotes(next)
    publish('note_set', { date: selKey, text })
    setSaved(true)
  }

  const year = view.getFullYear()
  const month = view.getMonth()
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  const leading = first.getDay()
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const shim = (dir: number) => setView(new Date(year, month + dir, 1))

  return (
    <GlowCard className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          <GradientText>📅 Party Calendar</GradientText>
        </h2>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">synced via Nostr · saved here</span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => shim(-1)}
          className="rounded-lg border border-slate-300 bg-white/70 px-3 py-1 text-sm hover:bg-white dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
        >
          ‹
        </button>
        <div className="text-lg font-bold capitalize">
          {MONTHS[month]} {year}
        </div>
        <button
          onClick={() => shim(1)}
          className="rounded-lg border border-slate-300 bg-white/70 px-3 py-1 text-sm hover:bg-white dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="mt-1 grid grid-cols-7 gap-1"
        >
          {cells.map((d, i) => {
            if (!d) return <div key={'b' + i} />
            const k = key(d)
            const hasNote = !!notes[k]
            const isToday = sameDay(d, today)
            const isSel = sameDay(d, selected)
            return (
              <button
                key={k}
                onClick={() => openDay(d)}
                className={`relative aspect-square rounded-xl text-sm font-medium transition ${
                  isSel
                    ? 'bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-[0_0_14px_-2px_rgba(34,211,238,0.7)]'
                    : 'border border-slate-200 bg-white/60 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                }`}
              >
                <span className={isToday && !isSel ? 'font-bold text-sky-600 dark:text-sky-300' : ''}>{d.getDate()}</span>
                {hasNote && (
                  <span
                    className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                      isSel ? 'bg-white' : 'bg-amber-400'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold">
          Note for{' '}
          <span className="text-sky-600 dark:text-sky-300">
            {MONTHS[selected.getMonth()]} {selected.getDate()}, {selected.getFullYear()}
          </span>
        </div>
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setSaved(false)
          }}
          rows={3}
          placeholder="Write a note for this day… (shared with everyone on the relay)"
          className="mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {saved ? '✓ Saved + synced' : selText && draft !== selText ? 'Unsaved changes' : selText ? 'Saved + synced' : ''}
          </span>
          <div className="flex gap-2">
            {selText && (
              <button
                onClick={() => {
                  setDraft('')
                  saveNote()
                }}
                className="rounded-lg border border-red-300/50 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 dark:border-red-400/30"
              >
                Delete
              </button>
            )}
            <ShimmerButton onClick={saveNote} className="!px-4 !py-1.5 !text-xs">
              Save Note
            </ShimmerButton>
          </div>
        </div>
      </div>
    </GlowCard>
  )
}
