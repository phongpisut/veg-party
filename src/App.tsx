import { useEffect, useRef, useState } from 'react'
import JoinModal from './components/JoinModal'
import DuckRace from './components/DuckRace'
import WheelOfFortune from './components/WheelOfFortune'
import Calendar from './components/Calendar'
import OnlineUsers from './components/OnlineUsers'
import Voting from './components/Voting'
import Toasts from './components/Toasts'
import ThemeToggle from './components/ThemeToggle'
import { Sparkles } from './components/ui'
import * as nostr from './nostr'
import { DURATION, raceResult, makeDuck, DEFAULT_WHEEL } from './gameState'
import type { Race, User, WheelItem, WheelSpin, Toast, VoteState, Me, NostrPayload } from './types'

const EMPTY_RACE: Race = {
  status: 'idle',
  raceId: null,
  hostId: null,
  hostName: '',
  ducks: [],
  startAt: 0,
  endAt: 0,
  ranking: null,
}

export default function App() {
  const [me, setMe] = useState<Me | null>(() => JSON.parse(localStorage.getItem('drp_user') || 'null') as Me | null)
  const [users, setUsers] = useState<Map<string, User>>(new Map())
  const [race, setRace] = useState<Race>(EMPTY_RACE)
  const [wheelSpins, setWheelSpins] = useState<WheelSpin[]>([])
  const [wheelItems, setWheelItems] = useState<WheelItem[]>(DEFAULT_WHEEL)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [vote, setVote] = useState<VoteState>({ poll: null, votes: new Map(), closed: false, anonymous: false })
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('drp_theme')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const seen = useRef(new Set<string>())
  const backfill = useRef(true) // true until the initial relay backlog has been replayed

  // apply + persist theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('drp_theme', theme)
  }, [theme])

  const raceRef = useRef(race)
  raceRef.current = race

  function addUser(id: string, name: string, emoji: string, lastSeen: number) {
    setUsers((prev) => {
      const next = new Map(prev)
      next.set(id, { id, name, emoji, lastSeen })
      return next
    })
  }

  function pushToast(user: { name: string; emoji: string }) {
    const t: Toast = { id: Date.now() + Math.random(), user }
    setToasts((prev) => [...prev.slice(-3), t])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000)
  }

  function handleEvent(type: string, ev: NostrPayload) {
    if (seen.current.has(ev.id)) return
    seen.current.add(ev.id)
    const { body } = ev
    const live = ev.created_at > Date.now() / 1000 - 6

    if (type === 'join') {
      // during backfill use the event's own timestamp (stale ones get pruned),
      // after connect use the local receive time so clock skew can't drop a real user
      const lastSeen = backfill.current ? ev.created_at : Math.floor(Date.now() / 1000)
      addUser(ev.pubkey, body.name, body.emoji, lastSeen)
      if (live && ev.pubkey !== nostr.myPubkey) pushToast({ name: body.name, emoji: body.emoji })
    } else if (type === 'heartbeat') {
      const lastSeen = backfill.current ? ev.created_at : Math.floor(Date.now() / 1000)
      addUser(ev.pubkey, body.name, body.emoji, lastSeen)
    } else if (type === 'wheel_spin') {
      setWheelSpins((prev) => [...prev, { id: ev.id, name: body.name, emoji: body.emoji, live }])
    } else if (type === 'wheel_set') {
      if (Array.isArray(body.items)) setWheelItems(body.items as WheelItem[])
    } else if (type === 'race_preview') {
      setRace({
        status: 'lobby',
        raceId: body.raceId,
        hostId: body.hostId,
        hostName: body.hostName,
        ducks: body.ducks,
        startAt: 0,
        endAt: 0,
        ranking: null,
      })
    } else if (type === 'race_start') {
      setRace((s) => ({
        ...s,
        status: s.raceId === body.raceId ? 'racing' : s.status,
        startAt: body.startAt,
        endAt: body.endAt,
      }))
    } else if (type === 'race_result') {
      setRace((s) =>
        s.raceId === body.raceId && s.status === 'racing'
          ? { ...s, status: 'finished', ranking: raceResult(s.ducks).ranking }
          : s,
      )
    } else if (type === 'race_reset') {
      setRace(EMPTY_RACE)
    } else if (type === 'poll_create') {
      setVote({ poll: body, votes: new Map(), closed: false, anonymous: !!body.anonymous })
    } else if (type === 'poll_vote') {
      setVote((p) => {
        if (!p.poll || p.poll.pollId !== body.pollId) return p
        const votes = new Map(p.votes)
        votes.set(ev.pubkey, body.topic)
        return { ...p, votes }
      })
    } else if (type === 'poll_close') {
      setVote((p) => (p.poll && p.poll.pollId === body.pollId ? { ...p, closed: true } : p))
    } else if (type === 'poll_toggle_anonymous') {
      setVote((p) => (p.poll && p.poll.pollId === body.pollId ? { ...p, anonymous: body.anonymous } : p))
    }
  }

  // connect + subscribe
  useEffect(() => {
    nostr.connect()
    const offConnected = nostr.on('connected', () => {
      // replay is done once the relay signals end-of-stored-events
      backfill.current = false
    })
    const types = ['join', 'heartbeat', 'wheel_spin', 'wheel_set', 'race_preview', 'race_start', 'race_result', 'race_reset', 'poll_create', 'poll_vote', 'poll_close', 'poll_toggle_anonymous']
    const fns = types.map((t) => nostr.on(t, (ev) => handleEvent(t, ev)))
    return () => {
      offConnected()
      fns.forEach((off) => off())
    }
  }, [])

  // heartbeat while joined
  useEffect(() => {
    if (!me) return
    nostr.publish('heartbeat', { name: me.name, emoji: me.emoji })
    const t = setInterval(() => nostr.publish('heartbeat', { name: me.name, emoji: me.emoji }), 10000)
    return () => clearInterval(t)
  }, [me])

  // drop users who have stopped heartbeating (lastSeen older than OFFLINE_AFTER)
  useEffect(() => {
    const OFFLINE_AFTER = 25
    const t = setInterval(() => {
      const now = Date.now() / 1000
      setUsers((prev) => {
        const next = new Map<string, User>()
        for (const [id, u] of prev) if (now - u.lastSeen < OFFLINE_AFTER) next.set(id, u)
        return next.size === prev.size ? prev : next
      })
    }, 2000)
    return () => clearInterval(t)
  }, [])

  // flip to finished when the 10s window elapses (all clients do this locally)
  useEffect(() => {
    if (race.status !== 'racing') return
    const { endAt, ducks } = race
    const finish = () =>
      setRace((s) => (s.status !== 'racing' ? s : { ...s, status: 'finished', ranking: raceResult(s.ducks).ranking }))
    const delay = endAt - Date.now()
    if (delay <= 0) {
      finish()
      return
    }
    const t = setTimeout(finish, delay)
    return () => clearTimeout(t)
  }, [race.status, race.startAt, race.endAt])

  function join(name: string, emoji: string) {
    const u: Me = { id: nostr.myPubkey, name, emoji }
    localStorage.setItem('drp_user', JSON.stringify(u))
    setMe(u)
    nostr.publish('join', u)
    // add self to user list locally via the local-emit of publish
  }

  const canStart = race.status === 'lobby' && race.hostId === nostr.myPubkey

  function createRace(names: string[]) {
    if (!names.length) {
      nostr.publish('race_reset', {})
      setRace(EMPTY_RACE)
      return
    }
    const raceId = `${nostr.myPubkey.slice(0, 8)}-${Date.now()}`
    const ducks = names.map((name, i) => makeDuck(`${raceId}-${i}`, name))
    nostr.publish('race_preview', { raceId, hostId: nostr.myPubkey, hostName: me?.name ?? '', ducks })
    setRace({ status: 'lobby', raceId, hostId: nostr.myPubkey, hostName: me?.name ?? '', ducks, startAt: 0, endAt: 0, ranking: null })
  }

  function startRace() {
    const r = raceRef.current
    if (r.status !== 'lobby' || r.hostId !== nostr.myPubkey || !r.ducks.length) return
    const startAt = Date.now() + 2500
    const endAt = startAt + DURATION * 1000
    const ducks = r.ducks
    nostr.publish('race_start', { raceId: r.raceId, startAt, endAt })
    setTimeout(() => {
      const res = raceResult(ducks)
      nostr.publish('race_result', {
        raceId: r.raceId,
        winnerId: res.winner.id,
        winnerName: res.winner.name,
        ranking: res.ranking.map((d) => d.id),
      })
    }, DURATION * 1000 + 2500)
  }

  function createPoll(title: string, topics: string[]) {
    nostr.publish('poll_create', {
      pollId: `${nostr.myPubkey.slice(0, 8)}-${Date.now()}`,
      title,
      topics,
      hostId: nostr.myPubkey,
      hostName: me?.name ?? 'Host',
      anonymous: false,
    })
  }

  function voteTopic(topic: string) {
    if (!vote.poll || vote.closed) return
    nostr.publish('poll_vote', { pollId: vote.poll.pollId, topic })
  }

  function closePoll() {
    if (vote.poll) nostr.publish('poll_close', { pollId: vote.poll.pollId })
  }

  function toggleAnonymous() {
    if (vote.poll) nostr.publish('poll_toggle_anonymous', { pollId: vote.poll.pollId, anonymous: !vote.anonymous })
  }

  function publishWheelItems(items: WheelItem[]) {
    if (Array.isArray(items)) nostr.publish('wheel_set', { items })
  }

  const meProps: Me = { id: nostr.myPubkey, name: me?.name ?? '', emoji: me?.emoji ?? '' }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Sparkles />
      <div className="relative mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-end gap-2">
            <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
          </div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">
            🥗 <span className="bg-gradient-to-r from-amber-500 via-pink-500 to-sky-500 dark:from-amber-200 dark:via-pink-300 dark:to-sky-300 bg-clip-text text-transparent">Party Tools</span>
          </h1>
          {me && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-1.5 text-sm dark:border-white/10 dark:bg-white/5">
              <span className="text-xl">{me.emoji}</span>
              <span className="font-semibold">{me.name}</span>
            </div>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <DuckRace race={race} me={meProps} canStart={canStart} onHostRace={createRace} onStart={startRace} />
            <WheelOfFortune wheelSpins={wheelSpins} items={wheelItems} onSetItems={publishWheelItems} me={meProps} onSpin={() => nostr.publish('wheel_spin', { name: me?.name ?? '', emoji: me?.emoji ?? '' })} />
            <Voting
              vote={vote}
              me={meProps}
              users={users}
              onCreate={createPoll}
              onVote={voteTopic}
              onClose={closePoll}
              onToggleAnonymous={toggleAnonymous}
            />
            <Calendar />
          </div>
          <div className="h-max">
            <OnlineUsers users={users} />
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500 dark:text-slate-500">
          Race positions are not sent over Nostr — every client calculates them
          from the shared race definition and start time, so everyone sees the same race.
        </footer>
      </div>
      <Toasts toasts={toasts} />
      {!me && <JoinModal onSubmit={join} />}
    </div>
  )
}
