# 🦆 Party Tools

A real-time party app — a shared **10-second duck race** and a **wheel of
fortune** — where every browser window is synced live over the **Nostr**
protocol. No server of your own needed: a free public relay is the message bus.

When someone joins they pick a name and an emoji, and every connected client
hears about it instantly.

## ✨ Features

- **Join with a name + emoji** — broadcast to everyone; a toast pops and the
  online list updates live (15s heartbeats prune stale users).
- **Duck Race (10s)** — the host names 2+ ducks. Each duck gets a random
  *speed condition* (`base` strength + `start speed` + `end speed`), shown as a
  badge (`Rocket Finish`, `Fast Start`, `Steady`, `Cruiser`, `Slowpoke`). The
  winner is a **dark horse** ~46% of the time — ducks that look slow from the
  start can surge to win.
- **Wheel of Fortune** — spin and everyone lands on the **same segment**,
  announced only after the wheel stops.
- **No server to run** — just `npm run dev`.

## 🧠 How the sync works (the interesting part)

Nostr is just an append-only pub/sub, so raw event streams don't give you
"shared state". This app flips that:

- Messages are broadcast on a custom event kind (`31337`) tagged
  `duck-river-party` on a free relay.
- **Only the *input* is sent**, not the animation state.
  - The duck race broadcasts the race **definition** (each duck's speed
    condition) and the **start time**. Each client integrates the **same**
    curve from the **same** start time, so every client computes **identical
    positions** locally — without ever sending positions over the wire.
  - The wheel broadcasts the spin; the landing segment is derived
    deterministically from that event's Nostr `id`, so all clients rotate to
    the same outcome.
- **Replay**: a freshly-joining client replays recent events and reconstructs
  the current race / wheel position, without animating anything that happened
  before it arrived.

### Relay set

Events publish to and are subscribed from several free public relays, so any
two clients sharing at least one relay stay in sync:

```
wss://relay.pocketnostr.com   (primary)
wss://relay.damus.io
wss://nostr.mom
```

You can add your own **backup relays** from the UI (saved to localStorage). If
one relay goes down, reconnection is automatic and the others keep sync alive.
All outgoing saves (calendar notes, user, relay list, theme) are written to
localStorage first, then published, so nothing is lost when a relay fails.

## 🚀 Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in two browser windows (same or different
machines), join as different users, host + start a race and spin the wheel —
both windows show the same race outcome and wheel result.

Other scripts: `npm run build` (production build), `npm run preview`.

## 🛠 Stack

Vite · React 18 · Tailwind CSS · framer-motion · [`nostr-tools`](https://github.com/nbd-wtf/nostr-tools)
