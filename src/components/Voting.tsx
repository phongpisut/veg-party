import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlowCard, GradientText, ShimmerButton } from './ui'
import type { VoteState, Me, User } from '../types'

export default function Voting({
  vote,
  me,
  users,
  onCreate,
  onVote,
  onClose,
  onToggleAnonymous,
}: {
  vote: VoteState
  me: Me
  users: Map<string, User>
  onCreate: (title: string, topics: string[]) => void
  onVote: (topic: string) => void
  onClose: () => void
  onToggleAnonymous: () => void
}) {
  const { poll, votes, closed, anonymous } = vote
  const isHost = poll && poll.hostId === me.id
  const joined = !!me.name

  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [topics, setTopics] = useState('')

  const groups: Record<string, string[]> = {}
  if (poll) for (const t of poll.topics) groups[t] = []
  for (const [pubkey, topic] of votes) if (groups[topic]) groups[topic].push(pubkey)
  const total = poll ? votes.size : 0
  const myVote = poll ? votes.get(me.id) : null
  const emojiOf = (pubkey: string) => users.get(pubkey)?.emoji || '🦆'

  function create() {
    const t = topics.split(',').map((x) => x.trim()).filter(Boolean)
    if (title.trim() && t.length >= 2) {
      onCreate(title.trim(), t)
      setTitle('')
      setTopics('')
      setCreating(false)
    }
  }

  const maxVotes = poll ? Math.max(0, ...Object.values(groups).map((g) => g.length)) : 0
  const showCreate = !poll || creating

  return (
    <GlowCard className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          <GradientText>🗳️ Party Vote</GradientText>
        </h2>
        {poll && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              closed ? 'bg-slate-300 text-slate-700 dark:bg-white/10 dark:text-slate-300' : 'bg-emerald-400/20 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {closed ? 'Closed' : `${total} vote${total === 1 ? '' : 's'}`}
          </span>
        )}
      </div>

      {showCreate ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create a topic; everyone picks one and can change their vote anytime.
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Vote title, e.g. Next party game"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
          />
          <input
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="Topics, comma separated, e.g. Mario Kart, Cards, Trivia"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
          />
          <div className="flex gap-2">
            <ShimmerButton
              onClick={create}
              disabled={!title.trim() || topics.split(',').map((x) => x.trim()).filter(Boolean).length < 2}
            >
              Create Vote →
            </ShimmerButton>
            {!!poll && (
              <button
                onClick={() => setCreating(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{poll!.title}</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">by {poll!.hostName}</span>
            {anonymous && (
              <span className="rounded-full bg-purple-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">
                Anonymous
              </span>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <AnimatePresence initial={false}>
              {poll!.topics.map((topic) => {
                const voters = groups[topic] || []
                const count = voters.length
                const pct = total ? Math.round((count / total) * 100) : 0
                const isMine = myVote === topic
                const isWinner = closed && count === maxVotes && maxVotes > 0
                return (
                  <motion.div
                    key={topic}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`relative rounded-xl border p-3 ${
                      isMine
                        ? 'border-sky-400 bg-sky-400/10'
                        : 'border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/5'
                    } ${closed && isWinner ? 'ring-2 ring-amber-400' : ''}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{topic}</span>
                      {closed && isWinner && <span className="text-amber-500">🏆</span>}
                      <span className="ml-auto text-sm font-bold tabular-nums">
                        {count} · {pct}%
                      </span>
                    </div>

                    {!anonymous && voters.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {voters.map((pubkey) => (
                          <motion.span
                            key={pubkey}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            title={users.get(pubkey)?.name || 'participant'}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-base ring-1 ring-white/20"
                          >
                            {emojiOf(pubkey)}
                          </motion.span>
                        ))}
                      </div>
                    )}

                    {closed ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-white/10">
                        <motion.div
                          className="h-full rounded bg-gradient-to-r from-sky-500 to-emerald-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    ) : (
                      <button
                        disabled={!joined}
                        onClick={() => onVote(topic)}
                        className={`mt-2 w-full rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                          isMine
                            ? 'bg-sky-500 text-white'
                            : joined
                              ? 'border border-sky-300/60 text-sky-700 hover:bg-sky-400/10 dark:text-sky-300'
                              : 'border border-slate-300 text-slate-400 dark:border-white/15'
                        }`}
                      >
                        {isMine ? `✓ Voted for ${topic}` : 'Vote'}
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {closed && (
            <button
              onClick={() => setCreating(true)}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              + Start a New Vote
            </button>
          )}

          {isHost && !closed && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={() => onToggleAnonymous()}
                  className="h-4 w-4 accent-purple-500"
                />
                Anonymous vote (hide avatars)
              </label>
              <ShimmerButton onClick={onClose} className="ml-auto !bg-red-500 !from-red-500 !to-red-500">
                Close Vote & Show Result
              </ShimmerButton>
            </div>
          )}
          {!isHost && !closed && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Waiting for host to close the vote to reveal the result.
            </p>
          )}
        </div>
      )}
    </GlowCard>
  )
}
