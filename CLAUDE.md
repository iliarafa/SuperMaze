# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SuperMaze ("Quantum Labyrinth") is an educational puzzle game that teaches classical vs quantum search algorithms through interactive gameplay. A classical agent searches paths one at a time while a quantum agent explores all paths simultaneously via superposition (Grover's algorithm). Built with React 19 + TypeScript + Vite, rendered entirely on HTML5 Canvas, and packaged for iOS via Capacitor.

## Commands

- `npm run dev` — Start dev server (localhost:5173)
- `npm run build` — Type-check (`tsc -b`) + Vite production build
- `npm run lint` — ESLint (flat config, ES2020)
- `npm run test` — Run all tests once (Vitest, node environment)
- `npm run test:watch` — Watch mode
- `npx vitest run src/game/__tests__/maze.test.ts` — Run a single test file

## Architecture

**Screen-based routing** in `App.tsx` manages all state: `landing → modeSelect → howToPlay → settings → game`. No Redux or Context — game state lives in `useRef`, settings sync via localStorage + CustomEvent.

### `src/game/` — Core logic (no React dependencies)
- **maze.ts** — Recursive backtracking maze generation with seeded RNG. Cells stored as `Uint8Array` bitfields (N=1, S=2, E=4, W=8). ~15% loop chance for multiple paths.
- **classicalAgent.ts** — Player-controlled agent. Tracks path as array of cells (`active`/`backtracked`), detects dead ends, records timing.
- **quantumAgent.ts** — Quantum simulation with phases: `expanding → charging → collapsing → travelling → finished`. BFS pathfinding, amplitude-based wave visualization, charge level determines collapse precision.
- **audio.ts** — Web Audio API synthesized sounds (no audio files). Move, backtrack, win, and quantum expansion sounds.
- **touchInput.ts / tiltInput.ts** — Swipe detection (20px threshold) and device orientation controls (8° deadzone, iOS permission).
- **agentRenderer.ts / quantumRenderer.ts** — Canvas drawing for classical path traces and quantum wave cells.
- **colors.ts** — Full color palette (dark navy bg, neon blue walls, gold classical path, cyan quantum wave).

### `src/components/` — React UI screens
- **MazeRenderer.tsx** (~600 lines) — Main game canvas: 60fps game loop via `requestAnimationFrame`, offscreen canvas optimization for static maze, DPR scaling for Retina, handles all input + rendering + game state transitions.
- **LandingPage / ModeSelect / HowToPlay / Settings.tsx** — Navigation screens.
- **SwipePad.tsx** — Optional on-screen joystick.

## Key Patterns

- **Canvas-only rendering**: All game graphics on `<canvas>`, no DOM overlays during gameplay. Static maze pre-rendered to offscreen canvas each frame.
- **Coordinate system**: Cell index = `y * width + x`. Direction bits checked via `cell & Direction.N`.
- **DPR scaling**: All canvas coordinates multiplied by `window.devicePixelRatio`.
- **Seeded RNG** (`random.ts`): Deterministic maze generation for reproducibility.
- **Commit style**: Conventional prefixes (`feat:`, `fix:`, `style:`), concise scope descriptions.

## Testing

Tests in `src/game/__tests__/` cover maze generation (dimensions, determinism, reachability, wall consistency), agent movement/backtracking, quantum BFS/amplitudes/collapse, touch input mapping, and RNG determinism. Tests use the `canvas` npm package for node-environment canvas support.
