// Shared domain types for the Party Tools app.

export interface Duck {
  id: string
  name: string
  taint?: boolean
  base: number
  s0: number
  s1: number
}

export interface RaceDuck extends Duck {
  final: number
}

export type RaceStatus = 'idle' | 'lobby' | 'racing' | 'finished'

export interface Race {
  status: RaceStatus
  raceId: string | null
  hostId: string | null
  hostName: string
  ducks: Duck[]
  startAt: number
  endAt: number
  ranking: RaceDuck[] | null
}

export interface WheelItem {
  label: string
  color: string
}

export interface WheelSpin {
  id: string
  name: string
  emoji: string
  live: boolean
}

export interface User {
  id: string
  name: string
  emoji: string
  lastSeen: number
}

export interface Poll {
  pollId: string
  title: string
  topics: string[]
  hostId: string
  hostName: string
  anonymous: boolean
}

export interface VoteState {
  poll: Poll | null
  votes: Map<string, string>
  closed: boolean
  anonymous: boolean
}

export interface Toast {
  id: number
  user: { name: string; emoji: string }
}

export interface Me {
  id: string
  name: string
  emoji: string
}

export interface NostrPayload {
  id: string
  pubkey: string
  created_at: number
  body: any
}

export interface Note {
  text: string
  ts: number
}

export type NoteMap = Record<string, Note>

export interface Seat {
  id: string
  name: string
  emoji: string
}

export type GuessPhase = 'lobby' | 'writing' | 'playing' | 'done'

export interface GuessGame {
  gameId: string
  hostId: string
  hostName: string
  rounds: number
  phase: GuessPhase
  seats: Seat[]
  names: Record<string, string> // seat id -> the secret name stuck on their forehead
  current: number // seat index whose turn it is
  round: number
  turn: number // turn counter; end_turn/solved must quote it so duplicates are ignored
  solved: string[] // seat ids in the order they guessed right
  solvedRound: Record<string, number>
  lastTs: number
}

export interface GuessEvent {
  id: string
  pubkey: string
  body: any
}
