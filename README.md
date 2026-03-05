# Quantum Labyrinth

A puzzle game that teaches the fundamental difference between classical and quantum search algorithms through direct, tactile gameplay.

Two agents. Same maze. Different rules.

The **Classical Agent** searches one path at a time — committing, backtracking, trying again. The **Quantum Agent** exists in superposition — exploring all paths simultaneously as a probability wave, then collapsing to the optimal solution.

## Game Modes

### Race Mode

You control the classical agent (orange). A quantum wave (blue-green) expands automatically through the maze at the same time.

- **You win:** reach the green exit cell (bottom-right) before the quantum agent finishes travelling.
- **You lose:** the quantum wave collapses and its dot reaches the exit first.
- **Game ends** when either agent reaches the exit.

At small mazes you can win. At large mazes, quantum's advantage makes it nearly impossible — you feel the scaling difference.

### Observe & Collapse

A quantum wave expands from the start, exploring all paths simultaneously. Once it reaches 50% coverage, hold anywhere to charge a collapse. Release to collapse the wave into a single path.

- **Short hold** (< 1/3 charge): imprecise collapse, up to 3 wrong turns.
- **Medium hold** (1/3 – 4/5 charge): 1 wrong turn allowed.
- **Long hold** (> 4/5 charge): perfect collapse onto the optimal path.
- **Game ends** when the collapsed path is fully travelled to the exit.
- Green path = optimal. Orange path = suboptimal.

## Features

- Seeded maze generation (recursive backtracking, deterministic per seed)
- Canvas renderer with Retina/HiDPI scaling
- Classical agent with touch controls (swipe + tap)
- Quantum agent with BFS wave expansion and charge-based collapse
- Path tracing with backtrack detection and dead end marking
- 60fps game loop with offscreen canvas optimization
- Mode select screen

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

- [ ] Level select screen
- [ ] Scoring + star rating system
- [ ] Insight cards between levels
- [ ] Capacitor iOS build
