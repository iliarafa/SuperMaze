# Quantum Labyrinth

A puzzle game that teaches the fundamental difference between classical and quantum search algorithms through direct, tactile gameplay.

Two agents. Same maze. Different rules.

The **Classical Agent** searches one path at a time — committing, backtracking, trying again. The **Quantum Agent** exists in superposition — exploring all paths simultaneously as a probability wave, then collapsing to the optimal solution.

## Current State (MVP)

- Seeded maze generation (recursive backtracking, deterministic per seed)
- Canvas renderer with Retina/HiDPI scaling
- Classical agent with touch controls (swipe + tap)
- Path tracing with backtrack detection and dead end marking
- 60fps game loop with offscreen canvas optimization

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 |
| Language | TypeScript |
| Build | Vite |
| Rendering | HTML5 Canvas |
| Testing | Vitest |
| Mobile (planned) | Capacitor |

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in a browser. Use Chrome DevTools device emulation for touch controls.

## Controls

| Action | Gesture |
|--------|---------|
| Move agent | Swipe in direction |
| Move to adjacent cell | Tap the cell |

## Tests

```bash
npm test
```

## Visual Design

Dark navy background (`#050A14`) with neon blue maze walls (`#1A6B8A`). Classical agent traces an orange path (`#FF7A2F`) with a red cursor. Backtracked paths dim to burnt orange (`#7A3010`). Dead ends marked with X.

## Roadmap

- [ ] Race mode: quantum BFS wave expansion + collapse animation
- [ ] Observe & Collapse mode: hold-to-charge mechanic
- [ ] Mode select + level select screens
- [ ] Scoring + star rating system
- [ ] Insight cards between levels
- [ ] Capacitor iOS build
