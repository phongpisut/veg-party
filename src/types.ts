// Shared domain types for the Duck River Party app.

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
