# Classical Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a manually-controlled classical agent to the maze with touch-based movement, orange path trace, backtrack detection, and dead end marking.

**Architecture:** Pure game logic in `classicalAgent.ts` (testable without DOM), touch handling in `touchInput.ts`, rendering via rAF game loop in refactored `MazeRenderer.tsx`. Offscreen canvas caches static maze; agent overlay redraws each frame.

**Tech Stack:** React 18+, TypeScript, HTML5 Canvas, Touch Events, Vitest

---

### Task 1: Extend colors

**Files:**
- Modify: `src/game/colors.ts`

**Step 1: Add classical agent colors**

Replace `src/game/colors.ts` with:
```ts
export const Colors = {
  background: '#050A14',
  wall: '#1A6B8A',
  startNode: '#4D9FFF',
  exitNode: '#00FF88',
  classicalPath: '#FF7A2F',
  classicalBacktrack: '#7A3010',
  classicalCursor: '#FF3333',
} as const;
```

**Step 2: Commit**

```bash
git add src/game/colors.ts
git commit -m "feat: add classical agent colors to design system"
```

---

### Task 2: Classical agent state and movement logic

**Files:**
- Create: `src/game/classicalAgent.ts`
- Test: `src/game/__tests__/classicalAgent.test.ts`

**Step 1: Write the failing tests**

Create `src/game/__tests__/classicalAgent.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateMaze, Direction, cellIndex, MazeData } from '../maze';
import {
  createAgentState,
  moveAgent,
  ClassicalAgentState,
} from '../classicalAgent';

// Use a small fixed maze for predictable tests
function makeTestMaze(): MazeData {
  return generateMaze(5, 5, 42);
}

describe('createAgentState', () => {
  it('initializes at maze start with one-cell path', () => {
    const maze = makeTestMaze();
    const state = createAgentState(maze);
    expect(state.position).toEqual([0, 0]);
    expect(state.path).toHaveLength(1);
    expect(state.path[0]).toEqual({ x: 0, y: 0, state: 'active' });
    expect(state.deadEnds.size).toBe(0);
    expect(state.moveCount).toBe(0);
    expect(state.finished).toBe(false);
  });
});

describe('moveAgent', () => {
  it('rejects movement into a wall', () => {
    const maze = makeTestMaze();
    const state = createAgentState(maze);
    // Try all 4 directions — at least one must be a wall at (0,0)
    // North is always a wall at (0,0) — top edge
    const result = moveAgent(state, maze, Direction.N);
    expect(result).toBe(false);
    expect(state.position).toEqual([0, 0]);
    expect(state.moveCount).toBe(0);
  });

  it('allows movement through an open passage', () => {
    const maze = makeTestMaze();
    const state = createAgentState(maze);
    const cell = maze.cells[cellIndex(maze.width, 0, 0)];
    // Find an open direction from (0,0)
    const openDir = [Direction.N, Direction.S, Direction.E, Direction.W].find(
      (d) => (cell & d) !== 0
    )!;
    const result = moveAgent(state, maze, openDir);
    expect(result).toBe(true);
    expect(state.position).not.toEqual([0, 0]);
    expect(state.moveCount).toBe(1);
    expect(state.path.length).toBe(2);
    expect(state.path[1].state).toBe('active');
  });

  it('detects backtrack when revisiting an active cell', () => {
    const maze = makeTestMaze();
    const state = createAgentState(maze);
    const cell = maze.cells[cellIndex(maze.width, 0, 0)];
    // Move forward
    const openDir = [Direction.N, Direction.S, Direction.E, Direction.W].find(
      (d) => (cell & d) !== 0
    )!;
    moveAgent(state, maze, openDir);
    const posAfterMove = [...state.position];

    // Move back to start
    const opposites: Record<number, number> = {
      [Direction.N]: Direction.S,
      [Direction.S]: Direction.N,
      [Direction.E]: Direction.W,
      [Direction.W]: Direction.E,
    };
    moveAgent(state, maze, opposites[openDir]);
    expect(state.position).toEqual([0, 0]);

    // The cell we moved to should now be backtracked
    const backtracked = state.path.filter((c) => c.state === 'backtracked');
    expect(backtracked.length).toBeGreaterThan(0);
  });

  it('detects dead ends on backtrack', () => {
    const maze = makeTestMaze();
    const state = createAgentState(maze);

    // Walk into a dead-end corridor and back out
    // Navigate until we find a dead end (cell with only 1 open neighbor)
    // For a 5x5 maze with seed 42, we can do a simple exploration
    const cell00 = maze.cells[cellIndex(maze.width, 0, 0)];
    const openDir = [Direction.N, Direction.S, Direction.E, Direction.W].find(
      (d) => (cell00 & d) !== 0
    )!;
    moveAgent(state, maze, openDir);

    const [nx, ny] = state.position;
    const cellNew = maze.cells[cellIndex(maze.width, nx, ny)];
    // Count open neighbors of the new cell
    const openCount = [Direction.N, Direction.S, Direction.E, Direction.W].filter(
      (d) => (cellNew & d) !== 0
    ).length;

    if (openCount === 1) {
      // This is a dead end (only way back). Backtrack.
      const opposites: Record<number, number> = {
        [Direction.N]: Direction.S,
        [Direction.S]: Direction.N,
        [Direction.E]: Direction.W,
        [Direction.W]: Direction.E,
      };
      moveAgent(state, maze, opposites[openDir]);
      expect(state.deadEnds.size).toBe(1);
    }
    // If not a dead end, that's fine — we just verify no false dead ends
    expect(state.deadEnds.size).toBeLessThanOrEqual(1);
  });

  it('sets finished when reaching the exit', () => {
    const maze = makeTestMaze();
    const state = createAgentState(maze);

    // BFS to find the path from start to exit, then walk it
    const path = bfsPath(maze);
    for (const dir of path) {
      moveAgent(state, maze, dir);
    }
    expect(state.position).toEqual(maze.exit);
    expect(state.finished).toBe(true);
  });

  it('rejects movement when finished', () => {
    const maze = makeTestMaze();
    const state = createAgentState(maze);
    const path = bfsPath(maze);
    for (const dir of path) {
      moveAgent(state, maze, dir);
    }
    expect(state.finished).toBe(true);
    const countBefore = state.moveCount;
    const cell = maze.cells[cellIndex(maze.width, state.position[0], state.position[1])];
    const openDir = [Direction.N, Direction.S, Direction.E, Direction.W].find(
      (d) => (cell & d) !== 0
    );
    if (openDir) {
      const result = moveAgent(state, maze, openDir);
      expect(result).toBe(false);
      expect(state.moveCount).toBe(countBefore);
    }
  });
});

// Helper: BFS from start to exit, returns array of Direction values
function bfsPath(maze: MazeData): number[] {
  const { width, height, start, exit } = maze;
  const visited = new Uint8Array(width * height);
  const parent = new Map<number, { from: number; dir: number }>();
  const queue: [number, number][] = [start];
  visited[cellIndex(width, start[0], start[1])] = 1;

  const dirs = [
    { dir: Direction.N, dx: 0, dy: -1 },
    { dir: Direction.S, dx: 0, dy: 1 },
    { dir: Direction.E, dx: 1, dy: 0 },
    { dir: Direction.W, dx: -1, dy: 0 },
  ];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const ci = cellIndex(width, cx, cy);
    const cell = maze.cells[ci];

    if (cx === exit[0] && cy === exit[1]) break;

    for (const { dir, dx, dy } of dirs) {
      if (!(cell & dir)) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      const ni = cellIndex(width, nx, ny);
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ni]) {
        visited[ni] = 1;
        parent.set(ni, { from: ci, dir });
        queue.push([nx, ny]);
      }
    }
  }

  // Reconstruct path as directions
  const result: number[] = [];
  let cur = cellIndex(width, exit[0], exit[1]);
  const startIdx = cellIndex(width, start[0], start[1]);
  while (cur !== startIdx) {
    const p = parent.get(cur)!;
    result.unshift(p.dir);
    cur = p.from;
  }
  return result;
}
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/__tests__/classicalAgent.test.ts`
Expected: FAIL — cannot find module `../classicalAgent`

**Step 3: Implement the classical agent**

Create `src/game/classicalAgent.ts`:
```ts
import { MazeData, Direction, DirectionDelta, cellIndex } from './maze';

export interface PathCell {
  x: number;
  y: number;
  state: 'active' | 'backtracked';
}

export interface ClassicalAgentState {
  position: [number, number];
  path: PathCell[];
  deadEnds: Set<string>;
  moveCount: number;
  finished: boolean;
}

export function createAgentState(maze: MazeData): ClassicalAgentState {
  const [sx, sy] = maze.start;
  return {
    position: [sx, sy],
    path: [{ x: sx, y: sy, state: 'active' }],
    deadEnds: new Set(),
    moveCount: 0,
    finished: false,
  };
}

/**
 * Attempt to move the agent in the given direction.
 * Returns true if the move was valid and executed, false otherwise.
 * Mutates the state in place.
 */
export function moveAgent(
  state: ClassicalAgentState,
  maze: MazeData,
  direction: number
): boolean {
  if (state.finished) return false;

  const [x, y] = state.position;
  const cell = maze.cells[cellIndex(maze.width, x, y)];

  // Check if passage exists in this direction
  if (!(cell & direction)) return false;

  const [dx, dy] = DirectionDelta[direction];
  const nx = x + dx;
  const ny = y + dy;

  // Bounds check
  if (nx < 0 || nx >= maze.width || ny < 0 || ny >= maze.height) return false;

  // Check if we're revisiting an active cell in the path (backtrack)
  const existingIndex = state.path.findIndex(
    (c) => c.x === nx && c.y === ny && c.state === 'active'
  );

  if (existingIndex !== -1) {
    // Backtracking: mark everything after existingIndex as backtracked
    const backtrackFrom = state.position;
    for (let i = existingIndex + 1; i < state.path.length; i++) {
      if (state.path[i].state === 'active') {
        state.path[i].state = 'backtracked';
      }
    }

    // Dead end detection: check if the cell we're leaving has
    // any open neighbors not yet in the path
    checkDeadEnd(state, maze, backtrackFrom[0], backtrackFrom[1]);
  }

  // Add new position to path
  state.path.push({ x: nx, y: ny, state: 'active' });
  state.position = [nx, ny];
  state.moveCount++;

  // Check win condition
  if (nx === maze.exit[0] && ny === maze.exit[1]) {
    state.finished = true;
  }

  return true;
}

function checkDeadEnd(
  state: ClassicalAgentState,
  maze: MazeData,
  cx: number,
  cy: number
): void {
  const cell = maze.cells[cellIndex(maze.width, cx, cy)];
  const directions = [Direction.N, Direction.S, Direction.E, Direction.W];
  const pathSet = new Set(state.path.map((c) => `${c.x},${c.y}`));

  for (const dir of directions) {
    if (!(cell & dir)) continue; // wall — skip
    const [dx, dy] = DirectionDelta[dir];
    const nx = cx + dx;
    const ny = cy + dy;
    if (!pathSet.has(`${nx},${ny}`)) {
      // There's an unvisited open neighbor — not a dead end
      return;
    }
  }

  // All open neighbors are in the path — this is a dead end
  state.deadEnds.add(`${cx},${cy}`);
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/__tests__/classicalAgent.test.ts`
Expected: 6 tests PASS

**Step 5: Commit**

```bash
git add src/game/classicalAgent.ts src/game/__tests__/classicalAgent.test.ts
git commit -m "feat: add classical agent state and movement logic"
```

---

### Task 3: Touch input handler

**Files:**
- Create: `src/game/touchInput.ts`
- Test: `src/game/__tests__/touchInput.test.ts`

**Step 1: Write the failing tests**

Create `src/game/__tests__/touchInput.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { detectSwipeDirection, touchToCell } from '../touchInput';
import { Direction } from '../maze';

describe('detectSwipeDirection', () => {
  it('returns E for rightward swipe', () => {
    expect(detectSwipeDirection(0, 0, 50, 5)).toBe(Direction.E);
  });

  it('returns W for leftward swipe', () => {
    expect(detectSwipeDirection(100, 0, 30, 5)).toBe(Direction.W);
  });

  it('returns S for downward swipe', () => {
    expect(detectSwipeDirection(0, 0, 5, 50)).toBe(Direction.S);
  });

  it('returns N for upward swipe', () => {
    expect(detectSwipeDirection(0, 100, 5, 30)).toBe(Direction.N);
  });

  it('returns null for movement below threshold', () => {
    expect(detectSwipeDirection(0, 0, 10, 5)).toBeNull();
  });

  it('returns null for zero movement', () => {
    expect(detectSwipeDirection(50, 50, 50, 50)).toBeNull();
  });
});

describe('touchToCell', () => {
  it('maps touch position to correct cell', () => {
    // cellSize=20, mazeOffsetX=10, mazeOffsetY=10
    // Touch at (30, 50) -> cell (1, 2)
    expect(touchToCell(30, 50, 20, 10, 10, 5, 5)).toEqual([1, 2]);
  });

  it('returns null for touch outside maze bounds', () => {
    expect(touchToCell(5, 5, 20, 10, 10, 5, 5)).toBeNull();
  });

  it('returns null for touch beyond maze right/bottom edge', () => {
    // mazeWidth=5, cellSize=20, offset=10 -> right edge at 10+100=110
    expect(touchToCell(120, 50, 20, 10, 10, 5, 5)).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/__tests__/touchInput.test.ts`
Expected: FAIL — cannot find module `../touchInput`

**Step 3: Implement touch input**

Create `src/game/touchInput.ts`:
```ts
import { Direction } from './maze';

const SWIPE_THRESHOLD = 20;

/**
 * Detect swipe direction from start/end touch coordinates.
 * Returns a Direction value or null if below threshold.
 */
export function detectSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): number | null {
  const dx = endX - startX;
  const dy = endY - startY;

  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
    return null;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? Direction.E : Direction.W;
  } else {
    return dy > 0 ? Direction.S : Direction.N;
  }
}

/**
 * Map a touch position to a maze cell coordinate.
 * Returns [x, y] or null if outside the maze.
 */
export function touchToCell(
  touchX: number,
  touchY: number,
  cellSize: number,
  mazeOffsetX: number,
  mazeOffsetY: number,
  mazeWidth: number,
  mazeHeight: number
): [number, number] | null {
  const relX = touchX - mazeOffsetX;
  const relY = touchY - mazeOffsetY;

  if (relX < 0 || relY < 0) return null;

  const cx = Math.floor(relX / cellSize);
  const cy = Math.floor(relY / cellSize);

  if (cx >= mazeWidth || cy >= mazeHeight) return null;

  return [cx, cy];
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/__tests__/touchInput.test.ts`
Expected: 9 tests PASS

**Step 5: Commit**

```bash
git add src/game/touchInput.ts src/game/__tests__/touchInput.test.ts
git commit -m "feat: add touch input handler (swipe + tap-to-cell)"
```

---

### Task 4: Refactor MazeRenderer to rAF game loop with offscreen canvas

**Files:**
- Modify: `src/components/MazeRenderer.tsx`

This task refactors the renderer from one-shot draw to a game loop. No agent drawing yet — just the architectural change. The maze should render identically to before.

**Step 1: Rewrite MazeRenderer.tsx**

Replace the entire file with:
```tsx
import { useRef, useEffect, useCallback } from 'react';
import { MazeData, cellIndex, Direction } from '../game/maze';
import { Colors } from '../game/colors';

interface MazeRendererProps {
  maze: MazeData;
}

function computeLayout(maze: MazeData) {
  const dpr = window.devicePixelRatio || 1;
  const containerSize = Math.min(window.innerWidth, window.innerHeight) - 32;
  const cellSize = Math.floor(containerSize / maze.width);
  const mazePixelSize = cellSize * maze.width;
  return { dpr, cellSize, mazePixelSize };
}

function drawMazeToCanvas(
  ctx: CanvasRenderingContext2D,
  maze: MazeData,
  cellSize: number,
  mazePixelSize: number
): void {
  // Background
  ctx.fillStyle = Colors.background;
  ctx.fillRect(0, 0, mazePixelSize, mazePixelSize);

  // Start and exit nodes
  const nodeInset = Math.floor(cellSize * 0.2);
  const nodeSize = cellSize - nodeInset * 2;

  ctx.fillStyle = Colors.startNode;
  const [sx, sy] = maze.start;
  ctx.fillRect(sx * cellSize + nodeInset, sy * cellSize + nodeInset, nodeSize, nodeSize);

  ctx.fillStyle = Colors.exitNode;
  const [ex, ey] = maze.exit;
  ctx.fillRect(ex * cellSize + nodeInset, ey * cellSize + nodeInset, nodeSize, nodeSize);

  // Walls
  ctx.strokeStyle = Colors.wall;
  ctx.lineWidth = 2;
  ctx.lineCap = 'square';

  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      const cell = maze.cells[cellIndex(maze.width, x, y)];
      const px = x * cellSize;
      const py = y * cellSize;

      if (!(cell & Direction.N)) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + cellSize, py);
        ctx.stroke();
      }

      if (!(cell & Direction.W)) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + cellSize);
        ctx.stroke();
      }

      if (y === maze.height - 1 && !(cell & Direction.S)) {
        ctx.beginPath();
        ctx.moveTo(px, py + cellSize);
        ctx.lineTo(px + cellSize, py + cellSize);
        ctx.stroke();
      }

      if (x === maze.width - 1 && !(cell & Direction.E)) {
        ctx.beginPath();
        ctx.moveTo(px + cellSize, py);
        ctx.lineTo(px + cellSize, py + cellSize);
        ctx.stroke();
      }
    }
  }

  // Outer border
  ctx.beginPath();
  ctx.moveTo(0, mazePixelSize);
  ctx.lineTo(mazePixelSize, mazePixelSize);
  ctx.lineTo(mazePixelSize, 0);
  ctx.stroke();
}

export function MazeRenderer({ maze }: MazeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const layoutRef = useRef<ReturnType<typeof computeLayout> | null>(null);

  // Rebuild offscreen canvas when maze changes
  useEffect(() => {
    const layout = computeLayout(maze);
    layoutRef.current = layout;
    const { dpr, cellSize, mazePixelSize } = layout;

    const offscreen = document.createElement('canvas');
    offscreen.width = mazePixelSize * dpr;
    offscreen.height = mazePixelSize * dpr;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.scale(dpr, dpr);
    drawMazeToCanvas(offCtx, maze, cellSize, mazePixelSize);
    offscreenRef.current = offscreen;
  }, [maze]);

  // Set up main canvas and rAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function frame() {
      const layout = layoutRef.current;
      const offscreen = offscreenRef.current;
      if (!layout || !offscreen || !ctx || !canvas) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const { dpr, mazePixelSize } = layout;

      // Size main canvas
      canvas.style.width = `${mazePixelSize}px`;
      canvas.style.height = `${mazePixelSize}px`;
      canvas.width = mazePixelSize * dpr;
      canvas.height = mazePixelSize * dpr;
      ctx.scale(dpr, dpr);

      // Draw cached maze
      ctx.drawImage(offscreen, 0, 0, mazePixelSize, mazePixelSize);

      // Agent overlay will be drawn here in Task 5

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} />;
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Run existing tests to verify no regressions**

Run: `npx vitest run`
Expected: All 9 tests still pass (random + maze tests).

**Step 4: Commit**

```bash
git add src/components/MazeRenderer.tsx
git commit -m "refactor: convert MazeRenderer to rAF game loop with offscreen canvas"
```

---

### Task 5: Draw agent overlay (path, cursor, dead ends)

**Files:**
- Modify: `src/components/MazeRenderer.tsx` (add agent drawing to the frame loop)
- Create: `src/game/agentRenderer.ts` (pure drawing functions)

**Step 1: Create the agent rendering functions**

Create `src/game/agentRenderer.ts`:
```ts
import { PathCell, ClassicalAgentState } from './classicalAgent';
import { Colors } from './colors';

/**
 * Draw the classical agent overlay: path trace, dead end markers, and cursor.
 */
export function drawClassicalAgent(
  ctx: CanvasRenderingContext2D,
  state: ClassicalAgentState,
  cellSize: number
): void {
  const half = cellSize / 2;

  // Draw path trace (backtracked first, then active on top)
  drawPathSegments(ctx, state.path, 'backtracked', Colors.classicalBacktrack, cellSize, half);
  drawPathSegments(ctx, state.path, 'active', Colors.classicalPath, cellSize, half);

  // Draw dead end markers
  ctx.strokeStyle = Colors.classicalBacktrack;
  ctx.lineWidth = 2;
  const xSize = Math.floor(cellSize * 0.2);
  for (const key of state.deadEnds) {
    const [dx, dy] = key.split(',').map(Number);
    const cx = dx * cellSize + half;
    const cy = dy * cellSize + half;
    ctx.beginPath();
    ctx.moveTo(cx - xSize, cy - xSize);
    ctx.lineTo(cx + xSize, cy + xSize);
    ctx.moveTo(cx + xSize, cy - xSize);
    ctx.lineTo(cx - xSize, cy + xSize);
    ctx.stroke();
  }

  // Draw cursor (red circle at current position)
  const [px, py] = state.position;
  const cursorRadius = Math.floor(cellSize * 0.3);
  ctx.fillStyle = Colors.classicalCursor;
  ctx.beginPath();
  ctx.arc(px * cellSize + half, py * cellSize + half, cursorRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPathSegments(
  ctx: CanvasRenderingContext2D,
  path: PathCell[],
  targetState: 'active' | 'backtracked',
  color: string,
  cellSize: number,
  half: number
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, Math.floor(cellSize * 0.15));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < path.length; i++) {
    if (path[i].state !== targetState) continue;
    // Draw segment from path[i-1] to path[i]
    const prev = path[i - 1];
    const curr = path[i];
    ctx.beginPath();
    ctx.moveTo(prev.x * cellSize + half, prev.y * cellSize + half);
    ctx.lineTo(curr.x * cellSize + half, curr.y * cellSize + half);
    ctx.stroke();
  }
}
```

**Step 2: Commit**

```bash
git add src/game/agentRenderer.ts
git commit -m "feat: add classical agent drawing functions"
```

---

### Task 6: Integrate agent into MazeRenderer + App

**Files:**
- Modify: `src/components/MazeRenderer.tsx` (accept agent state, draw overlay, handle touch)
- Modify: `src/App.tsx` (create agent state, pass to renderer)

**Step 1: Update MazeRenderer to accept and draw agent, handle touch input**

Replace the full `src/components/MazeRenderer.tsx` with:
```tsx
import { useRef, useEffect, useCallback } from 'react';
import { MazeData, cellIndex, Direction, DirectionDelta } from '../game/maze';
import { Colors } from '../game/colors';
import { ClassicalAgentState, moveAgent } from '../game/classicalAgent';
import { drawClassicalAgent } from '../game/agentRenderer';
import { detectSwipeDirection, touchToCell } from '../game/touchInput';

interface MazeRendererProps {
  maze: MazeData;
  agentState?: ClassicalAgentState;
}

function computeLayout(maze: MazeData) {
  const dpr = window.devicePixelRatio || 1;
  const containerSize = Math.min(window.innerWidth, window.innerHeight) - 32;
  const cellSize = Math.floor(containerSize / maze.width);
  const mazePixelSize = cellSize * maze.width;
  return { dpr, cellSize, mazePixelSize };
}

function drawMazeToCanvas(
  ctx: CanvasRenderingContext2D,
  maze: MazeData,
  cellSize: number,
  mazePixelSize: number
): void {
  ctx.fillStyle = Colors.background;
  ctx.fillRect(0, 0, mazePixelSize, mazePixelSize);

  const nodeInset = Math.floor(cellSize * 0.2);
  const nodeSize = cellSize - nodeInset * 2;

  ctx.fillStyle = Colors.startNode;
  const [sx, sy] = maze.start;
  ctx.fillRect(sx * cellSize + nodeInset, sy * cellSize + nodeInset, nodeSize, nodeSize);

  ctx.fillStyle = Colors.exitNode;
  const [ex, ey] = maze.exit;
  ctx.fillRect(ex * cellSize + nodeInset, ey * cellSize + nodeInset, nodeSize, nodeSize);

  ctx.strokeStyle = Colors.wall;
  ctx.lineWidth = 2;
  ctx.lineCap = 'square';

  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      const cell = maze.cells[cellIndex(maze.width, x, y)];
      const px = x * cellSize;
      const py = y * cellSize;

      if (!(cell & Direction.N)) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + cellSize, py);
        ctx.stroke();
      }

      if (!(cell & Direction.W)) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + cellSize);
        ctx.stroke();
      }

      if (y === maze.height - 1 && !(cell & Direction.S)) {
        ctx.beginPath();
        ctx.moveTo(px, py + cellSize);
        ctx.lineTo(px + cellSize, py + cellSize);
        ctx.stroke();
      }

      if (x === maze.width - 1 && !(cell & Direction.E)) {
        ctx.beginPath();
        ctx.moveTo(px + cellSize, py);
        ctx.lineTo(px + cellSize, py + cellSize);
        ctx.stroke();
      }
    }
  }

  ctx.beginPath();
  ctx.moveTo(0, mazePixelSize);
  ctx.lineTo(mazePixelSize, mazePixelSize);
  ctx.lineTo(mazePixelSize, 0);
  ctx.stroke();
}

export function MazeRenderer({ maze, agentState }: MazeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const layoutRef = useRef<ReturnType<typeof computeLayout> | null>(null);
  const mazeRef = useRef(maze);
  const agentRef = useRef(agentState);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Keep refs in sync
  agentRef.current = agentState;
  mazeRef.current = maze;

  // Rebuild offscreen canvas when maze changes
  useEffect(() => {
    const layout = computeLayout(maze);
    layoutRef.current = layout;
    const { dpr, cellSize, mazePixelSize } = layout;

    const offscreen = document.createElement('canvas');
    offscreen.width = mazePixelSize * dpr;
    offscreen.height = mazePixelSize * dpr;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.scale(dpr, dpr);
    drawMazeToCanvas(offCtx, maze, cellSize, mazePixelSize);
    offscreenRef.current = offscreen;
  }, [maze]);

  // Touch handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const agent = agentRef.current;
    const m = mazeRef.current;
    const layout = layoutRef.current;
    const canvas = canvasRef.current;
    const start = touchStartRef.current;

    if (!agent || !m || !layout || !canvas || !start) return;

    const endX = touch.clientX;
    const endY = touch.clientY;

    // Try swipe first
    const swipeDir = detectSwipeDirection(start.x, start.y, endX, endY);
    if (swipeDir !== null) {
      moveAgent(agent, m, swipeDir);
      touchStartRef.current = null;
      return;
    }

    // Fall back to tap: map to cell, check adjacency, move
    const rect = canvas.getBoundingClientRect();
    const tapX = endX - rect.left;
    const tapY = endY - rect.top;
    const cell = touchToCell(
      tapX, tapY,
      layout.cellSize,
      0, 0,
      m.width, m.height
    );

    if (cell) {
      const [cx, cy] = cell;
      const [ax, ay] = agent.position;
      const dx = cx - ax;
      const dy = cy - ay;

      // Only allow adjacent cell taps (manhattan distance 1)
      if (Math.abs(dx) + Math.abs(dy) === 1) {
        let dir: number | null = null;
        if (dx === 1) dir = Direction.E;
        else if (dx === -1) dir = Direction.W;
        else if (dy === 1) dir = Direction.S;
        else if (dy === -1) dir = Direction.N;

        if (dir !== null) {
          moveAgent(agent, m, dir);
        }
      }
    }

    touchStartRef.current = null;
  }, []);

  // Set up canvas, touch events, and rAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    function frame() {
      const layout = layoutRef.current;
      const offscreen = offscreenRef.current;
      if (!layout || !offscreen || !ctx || !canvas) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const { dpr, cellSize, mazePixelSize } = layout;

      canvas.style.width = `${mazePixelSize}px`;
      canvas.style.height = `${mazePixelSize}px`;
      if (canvas.width !== mazePixelSize * dpr) {
        canvas.width = mazePixelSize * dpr;
        canvas.height = mazePixelSize * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Draw cached maze
      ctx.drawImage(offscreen, 0, 0, mazePixelSize, mazePixelSize);

      // Draw agent overlay
      const agent = agentRef.current;
      if (agent) {
        drawClassicalAgent(ctx, agent, cellSize);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return <canvas ref={canvasRef} style={{ touchAction: 'none' }} />;
}
```

**Step 2: Update App.tsx to create agent state**

Replace `src/App.tsx` with:
```tsx
import { useMemo, useRef } from 'react';
import { generateMaze } from './game/maze';
import { createAgentState } from './game/classicalAgent';
import { MazeRenderer } from './components/MazeRenderer';
import { Colors } from './game/colors';

function App() {
  const maze = useMemo(() => generateMaze(25, 25, 42), []);
  const agentState = useRef(createAgentState(maze));

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: Colors.background,
      }}
    >
      <MazeRenderer maze={maze} agentState={agentState.current} />
    </div>
  );
}

export default App;
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (9 original + 6 agent + 9 touch = 24 tests).

**Step 5: Commit**

```bash
git add src/components/MazeRenderer.tsx src/App.tsx
git commit -m "feat: integrate classical agent into game loop with touch input"
```

---

### Task 7: Final verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All 24 tests pass.

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Visual check in browser**

Run: `npm run dev`
Verify on a touch device or mobile emulator (Chrome DevTools toggle device toolbar):
- Red cursor circle visible at top-left (0,0) on the blue start node
- Swiping moves the agent in that direction (only through open passages)
- Orange path trace follows the agent
- Walking back over the path marks segments as dim burnt orange (backtracked)
- Dead end cells show a small dim X after backtracking out
- Reaching bottom-right exit stops movement
- Maze still renders with neon blue walls, same as before

**Step 4: Final commit if any cleanup needed**

```bash
git status
# Only commit if there are changes
```
