# Maze Data Structure, Generator & Canvas Renderer — Design

## Architecture

Three modules:

1. **`maze.ts`** — Data structure + generator (pure logic, no rendering)
2. **`MazeRenderer.tsx`** — React component wrapping an HTML5 Canvas
3. **`App.tsx`** — Minimal shell that wires them together

Separation keeps maze logic independently testable and reusable by future game modes.

## Maze Data Structure

2D grid of cells. Each cell tracks open walls via bitmask (`N=1, S=2, E=4, W=8`).

```ts
MazeData {
  width: number      // 25
  height: number     // 25
  cells: Uint8Array  // width * height, bitmask per cell
  start: [number, number]  // top-left (0,0)
  exit: [number, number]   // bottom-right (24,24)
}
```

## Maze Generator

Recursive backtracking with seeded PRNG (mulberry32, no dependencies).

1. Start at (0,0), mark visited
2. Pick random unvisited neighbor (seeded RNG)
3. Remove wall between current and neighbor, recurse
4. Backtrack when no unvisited neighbors remain

Produces perfect mazes (exactly one path between any two cells) — guarantees unique solution.

## Canvas Renderer

Renders maze onto HTML5 `<canvas>`. Key decisions:

- **Cell size**: `Math.floor(canvas_size / grid_size)` — floored to avoid sub-pixel artifacts on wall lines
- **Walls drawn as lines** (not filled cells) — neon wireframe aesthetic
- **Colors from design system**: walls `#1A6B8A`, background `#050A14`, start `#4D9FFF`, exit `#00FF88`
- **Canvas sized to fill viewport** with aspect ratio maintained
- **Retina/HiDPI scaling**: `canvas.width = displaySize * window.devicePixelRatio` + `ctx.scale(dpr, dpr)` — built in from day one so it's sharp on iPhone/Retina screens
- **Static render** for now, structured so animation loop can be added later

## Output

Browser page showing a generated 25x25 maze with neon blue walls on dark background, start/exit nodes highlighted. Same seed = same maze. Different seeds = different mazes.
