# Observe & Collapse Mode — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Observe & Collapse game mode — a quantum wave expands through the maze, the player holds to charge a collapse, and an agent travels the resolved path.

**Architecture:** New `quantumAgent.ts` module handles the state machine (expanding → charging → collapsing → travelling → finished), BFS solver, amplitude assignment, and collapse logic. New `quantumRenderer.ts` draws the wave, charge indicator, and travel animation. `MazeRenderer.tsx` gains a `quantumState` prop and hold gesture. `App.tsx` routes `observe` mode to the quantum flow.

**Tech Stack:** TypeScript, Vitest, HTML5 Canvas, React 19

**Design doc:** `docs/plans/2026-03-04-observe-collapse-design.md`

---

### Task 1: Add quantum colors to Colors object

**Files:**
- Modify: `src/game/colors.ts`

**Step 1: Add the two new colors**

Add `quantumWave` and `quantumSuboptimal` to the `Colors` object:

```ts
export const Colors = {
  background: '#050A14',
  wall: '#1A6B8A',
  startNode: '#4D9FFF',
  exitNode: '#00FF88',
  classicalPath: '#FF7A2F',
  classicalBacktrack: '#7A3010',
  classicalCursor: '#FF3333',
  accent: '#6EC6E6',
  textPrimary: '#B8D4E8',
  quantumWave: '#00E5CC',
  quantumSuboptimal: '#FFC04D',
} as const;
```

**Step 2: Commit**

```bash
git add src/game/colors.ts
git commit -m "feat: add quantum wave and suboptimal colors"
```

---

### Task 2: BFS solver — `bfsPath` and `bfsDistanceMap`

These are pure functions needed by the quantum agent. BFS from start to exit yields the optimal path. BFS from all optimal-path cells yields a distance map used for amplitude assignment.

**Files:**
- Create: `src/game/quantumAgent.ts`
- Create: `src/game/__tests__/quantumAgent.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { generateMaze, cellIndex, Direction } from '../maze';
import type { MazeData } from '../maze';
import { bfsPath, bfsDistanceMap } from '../quantumAgent';

function makeTestMaze(): MazeData {
  return generateMaze(5, 5, 42);
}

describe('bfsPath', () => {
  it('returns a non-empty path from start to exit', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual(maze.start);
    expect(path[path.length - 1]).toEqual(maze.exit);
  });

  it('each consecutive pair is adjacent (manhattan distance 1)', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    for (let i = 1; i < path.length; i++) {
      const dx = Math.abs(path[i][0] - path[i - 1][0]);
      const dy = Math.abs(path[i][1] - path[i - 1][1]);
      expect(dx + dy).toBe(1);
    }
  });

  it('each step goes through an open passage (no wall between consecutive cells)', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    for (let i = 1; i < path.length; i++) {
      const [px, py] = path[i - 1];
      const [cx, cy] = path[i];
      const dx = cx - px;
      const dy = cy - py;
      let dir: number;
      if (dx === 1) dir = Direction.E;
      else if (dx === -1) dir = Direction.W;
      else if (dy === 1) dir = Direction.S;
      else dir = Direction.N;
      const cell = maze.cells[cellIndex(maze.width, px, py)];
      expect(cell & dir).toBeTruthy();
    }
  });
});

describe('bfsDistanceMap', () => {
  it('returns 0 for cells on the optimal path', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    const distMap = bfsDistanceMap(maze, path);
    for (const [x, y] of path) {
      expect(distMap.get(`${x},${y}`)).toBe(0);
    }
  });

  it('returns positive distance for cells off the optimal path', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    const pathSet = new Set(path.map(([x, y]) => `${x},${y}`));
    const distMap = bfsDistanceMap(maze, path);
    for (const [key, dist] of distMap) {
      if (!pathSet.has(key)) {
        expect(dist).toBeGreaterThan(0);
      }
    }
  });

  it('covers all reachable cells', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    const distMap = bfsDistanceMap(maze, path);
    expect(distMap.size).toBe(maze.width * maze.height);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: FAIL — `bfsPath` and `bfsDistanceMap` not found

**Step 3: Implement `bfsPath` and `bfsDistanceMap`**

Create `src/game/quantumAgent.ts`:

```ts
import type { MazeData } from './maze';
import { Direction, DirectionDelta, cellIndex } from './maze';

const AllDirections = [Direction.N, Direction.S, Direction.E, Direction.W];

/**
 * BFS from maze.start to maze.exit. Returns array of [x,y] coordinates.
 */
export function bfsPath(maze: MazeData): [number, number][] {
  const { width, height, start, exit } = maze;
  const visited = new Uint8Array(width * height);
  const parent = new Map<number, { from: number; x: number; y: number }>();
  const queue: [number, number][] = [start];
  const si = cellIndex(width, start[0], start[1]);
  visited[si] = 1;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const ci = cellIndex(width, cx, cy);
    if (cx === exit[0] && cy === exit[1]) break;

    const cell = maze.cells[ci];
    for (const dir of AllDirections) {
      if (!(cell & dir)) continue;
      const [dx, dy] = DirectionDelta[dir];
      const nx = cx + dx;
      const ny = cy + dy;
      const ni = cellIndex(width, nx, ny);
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ni]) {
        visited[ni] = 1;
        parent.set(ni, { from: ci, x: cx, y: cy });
        queue.push([nx, ny]);
      }
    }
  }

  // Reconstruct path
  const path: [number, number][] = [];
  let cur = cellIndex(width, exit[0], exit[1]);
  path.push(exit);
  while (cur !== si) {
    const p = parent.get(cur)!;
    path.push([p.x, p.y]);
    cur = p.from;
  }
  path.reverse();
  return path;
}

/**
 * BFS from all optimal-path cells outward. Returns Map<"x,y", distance>.
 * Distance 0 = on optimal path.
 */
export function bfsDistanceMap(
  maze: MazeData,
  optimalPath: [number, number][]
): Map<string, number> {
  const { width, height } = maze;
  const dist = new Map<string, number>();
  const queue: { x: number; y: number; d: number }[] = [];

  for (const [x, y] of optimalPath) {
    const key = `${x},${y}`;
    dist.set(key, 0);
    queue.push({ x, y, d: 0 });
  }

  while (queue.length > 0) {
    const { x, y, d } = queue.shift()!;
    const cell = maze.cells[cellIndex(width, x, y)];
    for (const dir of AllDirections) {
      if (!(cell & dir)) continue;
      const [dx, dy] = DirectionDelta[dir];
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !dist.has(key)) {
        dist.set(key, d + 1);
        queue.push({ x: nx, y: ny, d: d + 1 });
      }
    }
  }

  return dist;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add src/game/quantumAgent.ts src/game/__tests__/quantumAgent.test.ts
git commit -m "feat: add BFS path solver and distance map for quantum agent"
```

---

### Task 3: Amplitude assignment — `computeAmplitudes`

Assigns amplitude to every cell based on distance from optimal path, per the design doc.

**Files:**
- Modify: `src/game/quantumAgent.ts`
- Modify: `src/game/__tests__/quantumAgent.test.ts`

**Step 1: Write the failing tests**

Append to the test file:

```ts
import { computeAmplitudes } from '../quantumAgent';

describe('computeAmplitudes', () => {
  it('assigns 1.0 to cells on the optimal path', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    const amps = computeAmplitudes(maze, path);
    for (const [x, y] of path) {
      expect(amps.get(`${x},${y}`)).toBe(1.0);
    }
  });

  it('assigns 0.6 to cells 1 step off optimal', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    const distMap = bfsDistanceMap(maze, path);
    const amps = computeAmplitudes(maze, path);
    for (const [key, dist] of distMap) {
      if (dist === 1) {
        expect(amps.get(key)).toBe(0.6);
      }
    }
  });

  it('assigns 0.3 to cells 2+ steps off optimal (excluding dead ends)', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    const distMap = bfsDistanceMap(maze, path);
    const amps = computeAmplitudes(maze, path);
    for (const [key, dist] of distMap) {
      if (dist >= 2) {
        const amp = amps.get(key)!;
        // Either 0.3 (not dead end) or 0.1 (dead end)
        expect(amp === 0.3 || amp === 0.1).toBe(true);
      }
    }
  });

  it('assigns 0.1 to dead ends (cells with only 1 open neighbor)', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    const amps = computeAmplitudes(maze, path);
    // Find a dead end cell
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = maze.cells[cellIndex(maze.width, x, y)];
        const openCount = AllDirections.filter((d) => (cell & d) !== 0).length;
        const key = `${x},${y}`;
        if (openCount === 1 && amps.get(key) !== 1.0) {
          // Dead end not on optimal path
          expect(amps.get(key)).toBe(0.1);
        }
      }
    }
  });

  it('covers all cells', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    const amps = computeAmplitudes(maze, path);
    expect(amps.size).toBe(maze.width * maze.height);
  });
});
```

Also add this import at the top of the test file (alongside the existing ones from `quantumAgent`):

```ts
const AllDirections = [Direction.N, Direction.S, Direction.E, Direction.W];
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: FAIL — `computeAmplitudes` not found

**Step 3: Implement `computeAmplitudes`**

Add to `src/game/quantumAgent.ts`:

```ts
/**
 * Compute amplitude for every cell based on distance from optimal path.
 * On path: 1.0, 1 step off: 0.6, 2+ steps off: 0.3, dead ends: 0.1
 */
export function computeAmplitudes(
  maze: MazeData,
  optimalPath: [number, number][]
): Map<string, number> {
  const { width, height } = maze;
  const distMap = bfsDistanceMap(maze, optimalPath);
  const amps = new Map<string, number>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const dist = distMap.get(key) ?? Infinity;
      const cell = maze.cells[cellIndex(width, x, y)];
      const openCount = AllDirections.filter((d) => (cell & d) !== 0).length;
      const isDeadEnd = openCount === 1;

      let amp: number;
      if (dist === 0) {
        amp = 1.0;
      } else if (isDeadEnd) {
        amp = 0.1;
      } else if (dist === 1) {
        amp = 0.6;
      } else {
        amp = 0.3;
      }
      amps.set(key, amp);
    }
  }

  return amps;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: PASS (all 11 tests)

**Step 5: Commit**

```bash
git add src/game/quantumAgent.ts src/game/__tests__/quantumAgent.test.ts
git commit -m "feat: add amplitude assignment based on distance from optimal path"
```

---

### Task 4: Wave expansion queue — `createQuantumState` and `initExpansionQueue`

Creates the initial quantum agent state and the jittered expansion queue that drives the flood-fill animation.

**Files:**
- Modify: `src/game/quantumAgent.ts`
- Modify: `src/game/__tests__/quantumAgent.test.ts`

**Step 1: Write the failing tests**

Append to the test file:

```ts
import { createQuantumState } from '../quantumAgent';

describe('createQuantumState', () => {
  it('starts in expanding phase', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    expect(state.phase).toBe('expanding');
  });

  it('has empty waveFrontier initially', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    expect(state.waveFrontier.size).toBe(0);
  });

  it('expandQueue covers all cells with jittered delays', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    expect(state.expandQueue.length).toBe(maze.width * maze.height);
    // Delays should all be non-negative
    for (const item of state.expandQueue) {
      expect(item.delay).toBeGreaterThanOrEqual(0);
    }
  });

  it('expandQueue starts from the maze start cell', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    // First item should be the start cell
    expect(state.expandQueue[0].x).toBe(maze.start[0]);
    expect(state.expandQueue[0].y).toBe(maze.start[1]);
    expect(state.expandQueue[0].delay).toBe(0);
  });

  it('totalCells equals maze dimensions', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    expect(state.totalCells).toBe(maze.width * maze.height);
  });

  it('optimalPath is precomputed', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    expect(state.optimalPath.length).toBeGreaterThan(1);
    expect(state.optimalPath[0]).toEqual(maze.start);
    expect(state.optimalPath[state.optimalPath.length - 1]).toEqual(maze.exit);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: FAIL — `createQuantumState` not found

**Step 3: Implement the state and expansion queue**

Add to `src/game/quantumAgent.ts`:

```ts
export interface QuantumAgentState {
  phase: 'expanding' | 'charging' | 'collapsing' | 'travelling' | 'finished';
  waveFrontier: Map<string, number>;   // "x,y" → amplitude 0–1
  expandQueue: { x: number; y: number; delay: number }[];
  expandedCount: number;
  totalCells: number;
  optimalPath: [number, number][];
  collapsedPath: [number, number][];
  amplitudes: Map<string, number>;
  chargeLevel: number;
  chargeStartTime: number;
  fingerPosition: [number, number] | null;
  travelIndex: number;
  travelStartTime: number;
  collapseStartTime: number;
}

/**
 * Create initial quantum agent state. Precomputes BFS, amplitudes,
 * and a jittered flood-fill expansion queue.
 */
export function createQuantumState(maze: MazeData): QuantumAgentState {
  const optimalPath = bfsPath(maze);
  const amplitudes = computeAmplitudes(maze, optimalPath);
  const expandQueue = buildExpansionQueue(maze);

  return {
    phase: 'expanding',
    waveFrontier: new Map(),
    expandQueue,
    expandedCount: 0,
    totalCells: maze.width * maze.height,
    optimalPath,
    collapsedPath: [],
    amplitudes,
    chargeLevel: 0,
    chargeStartTime: 0,
    fingerPosition: null,
    travelIndex: 0,
    travelStartTime: 0,
    collapseStartTime: 0,
  };
}

/**
 * BFS flood-fill from start with jittered delays (~125ms per cell ± 50ms).
 */
function buildExpansionQueue(
  maze: MazeData
): { x: number; y: number; delay: number }[] {
  const { width, height, start } = maze;
  const visited = new Uint8Array(width * height);
  const queue: { x: number; y: number; delay: number }[] = [];
  const bfsQueue: { x: number; y: number; baseDelay: number }[] = [];

  const si = cellIndex(width, start[0], start[1]);
  visited[si] = 1;
  bfsQueue.push({ x: start[0], y: start[1], baseDelay: 0 });
  queue.push({ x: start[0], y: start[1], delay: 0 });

  const BASE_RATE = 125; // ms per cell
  const JITTER = 50;     // ±ms

  while (bfsQueue.length > 0) {
    const { x, y, baseDelay } = bfsQueue.shift()!;
    const cell = maze.cells[cellIndex(width, x, y)];

    for (const dir of AllDirections) {
      if (!(cell & dir)) continue;
      const [dx, dy] = DirectionDelta[dir];
      const nx = x + dx;
      const ny = y + dy;
      const ni = cellIndex(width, nx, ny);
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ni]) {
        visited[ni] = 1;
        const jitter = (Math.random() - 0.5) * 2 * JITTER;
        const delay = baseDelay + BASE_RATE + jitter;
        bfsQueue.push({ x: nx, y: ny, baseDelay: delay });
        queue.push({ x: nx, y: ny, delay: Math.max(0, delay) });
      }
    }
  }

  // Sort by delay so we process in order
  queue.sort((a, b) => a.delay - b.delay);
  return queue;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: PASS (all 17 tests)

**Step 5: Commit**

```bash
git add src/game/quantumAgent.ts src/game/__tests__/quantumAgent.test.ts
git commit -m "feat: add quantum state creation with jittered expansion queue"
```

---

### Task 5: Expansion tick — `tickExpansion`

Processes the expansion queue each frame, adding cells whose delay has elapsed to the wave frontier.

**Files:**
- Modify: `src/game/quantumAgent.ts`
- Modify: `src/game/__tests__/quantumAgent.test.ts`

**Step 1: Write the failing tests**

```ts
import { tickExpansion } from '../quantumAgent';

describe('tickExpansion', () => {
  it('adds cells to waveFrontier as time passes', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    // Simulate 500ms elapsed — should expand several cells
    tickExpansion(state, 500);
    expect(state.waveFrontier.size).toBeGreaterThan(0);
    expect(state.expandedCount).toBe(state.waveFrontier.size);
  });

  it('does not expand beyond the queue', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    // Simulate huge time — all cells should expand
    tickExpansion(state, 1_000_000);
    expect(state.waveFrontier.size).toBe(maze.width * maze.height);
    expect(state.expandQueue.length).toBe(0);
  });

  it('assigns precomputed amplitude to each expanded cell', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    for (const [key, amp] of state.waveFrontier) {
      expect(amp).toBe(state.amplitudes.get(key));
    }
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: FAIL — `tickExpansion` not found

**Step 3: Implement `tickExpansion`**

Add to `src/game/quantumAgent.ts`:

```ts
/**
 * Process expansion queue: add cells whose delay <= elapsedMs to the frontier.
 * Call this every frame with the total elapsed time since expansion started.
 */
export function tickExpansion(state: QuantumAgentState, elapsedMs: number): void {
  if (state.phase !== 'expanding') return;

  while (state.expandQueue.length > 0 && state.expandQueue[0].delay <= elapsedMs) {
    const { x, y } = state.expandQueue.shift()!;
    const key = `${x},${y}`;
    const amplitude = state.amplitudes.get(key) ?? 0.3;
    state.waveFrontier.set(key, amplitude);
    state.expandedCount++;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: PASS (all 20 tests)

**Step 5: Commit**

```bash
git add src/game/quantumAgent.ts src/game/__tests__/quantumAgent.test.ts
git commit -m "feat: add wave expansion tick processing"
```

---

### Task 6: Collapse logic — `startCharge`, `updateCharge`, `collapse`

Handles the hold-to-charge mechanic and the collapse algorithm that produces the resolved path.

**Files:**
- Modify: `src/game/quantumAgent.ts`
- Modify: `src/game/__tests__/quantumAgent.test.ts`

**Step 1: Write the failing tests**

```ts
import { startCharge, updateCharge, collapse } from '../quantumAgent';

describe('startCharge', () => {
  it('transitions to charging only when >=50% expanded', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    // Not enough expanded
    const started = startCharge(state, 100, [50, 50]);
    expect(started).toBe(false);
    expect(state.phase).toBe('expanding');

    // Expand everything
    tickExpansion(state, 1_000_000);
    const started2 = startCharge(state, 200, [50, 50]);
    expect(started2).toBe(true);
    expect(state.phase).toBe('charging');
    expect(state.chargeStartTime).toBe(200);
    expect(state.fingerPosition).toEqual([50, 50]);
  });
});

describe('updateCharge', () => {
  it('updates chargeLevel based on elapsed time', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    startCharge(state, 0, [50, 50]);

    updateCharge(state, 500); // 500ms elapsed → 50% charge
    expect(state.chargeLevel).toBeGreaterThan(0);
    expect(state.chargeLevel).toBeLessThanOrEqual(1);
  });

  it('caps chargeLevel at 1.0', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    startCharge(state, 0, [50, 50]);

    updateCharge(state, 5000); // 5s elapsed → fully charged
    expect(state.chargeLevel).toBe(1);
  });
});

describe('collapse', () => {
  it('transitions to collapsing phase', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    startCharge(state, 0, [50, 50]);
    updateCharge(state, 1000);
    collapse(state, 1000);
    expect(state.phase).toBe('collapsing');
  });

  it('produces a collapsedPath from start to exit', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    startCharge(state, 0, [50, 50]);
    updateCharge(state, 1000); // full charge
    collapse(state, 1000);
    expect(state.collapsedPath.length).toBeGreaterThan(1);
    expect(state.collapsedPath[0]).toEqual(maze.start);
    expect(state.collapsedPath[state.collapsedPath.length - 1]).toEqual(maze.exit);
  });

  it('with full charge (>=80%), uses optimal path directly', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    startCharge(state, 0, [50, 50]);
    updateCharge(state, 1000); // chargeLevel = 1.0
    collapse(state, 1000);
    expect(state.collapsedPath).toEqual(state.optimalPath);
  });

  it('with zero charge, may deviate from optimal (up to 3 deviations)', () => {
    const maze = generateMaze(15, 15, 42); // bigger maze for more junctions
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    startCharge(state, 0, [50, 50]);
    updateCharge(state, 0); // 0 charge → chargeLevel near 0
    collapse(state, 0);
    // Path should still go from start to exit
    expect(state.collapsedPath[0]).toEqual(maze.start);
    expect(state.collapsedPath[state.collapsedPath.length - 1]).toEqual(maze.exit);
  });

  it('collapsed path has no wall violations', () => {
    const maze = generateMaze(10, 10, 7);
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    startCharge(state, 0, [50, 50]);
    updateCharge(state, 200); // partial charge
    collapse(state, 200);
    const path = state.collapsedPath;
    for (let i = 1; i < path.length; i++) {
      const [px, py] = path[i - 1];
      const [cx, cy] = path[i];
      const dx = cx - px;
      const dy = cy - py;
      let dir: number;
      if (dx === 1) dir = Direction.E;
      else if (dx === -1) dir = Direction.W;
      else if (dy === 1) dir = Direction.S;
      else dir = Direction.N;
      const cell = maze.cells[cellIndex(maze.width, px, py)];
      expect(cell & dir).toBeTruthy();
    }
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: FAIL — `startCharge`, `updateCharge`, `collapse` not found

**Step 3: Implement charge and collapse**

Add to `src/game/quantumAgent.ts`:

```ts
const CHARGE_DURATION = 1000; // ms to reach full charge

/**
 * Attempt to start charging. Returns false if <50% expanded.
 */
export function startCharge(
  state: QuantumAgentState,
  now: number,
  fingerPos: [number, number]
): boolean {
  if (state.phase !== 'expanding') return false;
  if (state.expandedCount < state.totalCells * 0.5) return false;

  state.phase = 'charging';
  state.chargeStartTime = now;
  state.fingerPosition = fingerPos;
  state.chargeLevel = 0;
  return true;
}

/**
 * Update charge level based on current time.
 */
export function updateCharge(state: QuantumAgentState, now: number): void {
  if (state.phase !== 'charging') return;
  const elapsed = now - state.chargeStartTime;
  state.chargeLevel = Math.min(1, elapsed / CHARGE_DURATION);
}

/**
 * Collapse the wave. Computes the resolved path based on charge level.
 */
export function collapse(state: QuantumAgentState, now: number): void {
  if (state.phase !== 'charging') return;

  state.phase = 'collapsing';
  state.collapseStartTime = now;

  // Determine max deviations from charge level
  let maxDeviations: number;
  if (state.chargeLevel >= 0.8) {
    maxDeviations = 0;
  } else if (state.chargeLevel >= 0.33) {
    maxDeviations = 1;
  } else {
    maxDeviations = 3;
  }

  if (maxDeviations === 0) {
    state.collapsedPath = [...state.optimalPath];
    return;
  }

  state.collapsedPath = computeDeviatedPath(state, maxDeviations);
}

/**
 * Build a path that deviates from optimal at random junctions.
 */
function computeDeviatedPath(
  state: QuantumAgentState,
  maxDeviations: number
): [number, number][] {
  const optPath = state.optimalPath;

  // Find junctions on the optimal path (cells with >2 open neighbors)
  // We need the maze for wall info — store a ref or recompute
  // Since we precomputed amplitudes which need maze, store junction indices
  const junctionIndices: number[] = [];
  const optPathSet = new Set(optPath.map(([x, y]) => `${x},${y}`));

  for (let i = 1; i < optPath.length - 1; i++) {
    const [x, y] = optPath[i];
    const amplitude = state.amplitudes.get(`${x},${y}`) ?? 0;
    // A junction on the optimal path has amplitude 1.0 and we need
    // to check if it has neighbors off the optimal path.
    // Use waveFrontier to find cells with multiple neighbors.
    // Simpler: count entries in waveFrontier adjacent to this cell
    // that are NOT the previous/next cell on the optimal path.
    const prevKey = `${optPath[i - 1][0]},${optPath[i - 1][1]}`;
    const nextKey = `${optPath[i + 1][0]},${optPath[i + 1][1]}`;
    let offPathNeighbors = 0;
    for (const dir of AllDirections) {
      const [dx, dy] = DirectionDelta[dir];
      const nx = x + dx;
      const ny = y + dy;
      const nKey = `${nx},${ny}`;
      if (state.waveFrontier.has(nKey) && nKey !== prevKey && nKey !== nextKey) {
        offPathNeighbors++;
      }
    }
    if (offPathNeighbors > 0) {
      junctionIndices.push(i);
    }
  }

  const actualDeviations = Math.min(maxDeviations, junctionIndices.length);
  if (actualDeviations === 0) {
    return [...optPath];
  }

  // Randomly select junction indices to deviate at
  const shuffled = [...junctionIndices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const deviationPoints = shuffled.slice(0, actualDeviations).sort((a, b) => a - b);

  // Build path, deviating at selected junctions
  const result: [number, number][] = [];
  let optIdx = 0;

  for (const devIdx of deviationPoints) {
    // Copy optimal path up to deviation point
    while (optIdx <= devIdx) {
      result.push(optPath[optIdx]);
      optIdx++;
    }

    // Take a wrong turn: find a neighbor not on the next optimal cell
    const [jx, jy] = optPath[devIdx];
    const nextOpt = optPath[devIdx + 1];
    const wrongNeighbors: [number, number][] = [];
    for (const dir of AllDirections) {
      const [dx, dy] = DirectionDelta[dir];
      const nx = jx + dx;
      const ny = jy + dy;
      if (
        state.waveFrontier.has(`${nx},${ny}`) &&
        !(nx === nextOpt[0] && ny === nextOpt[1]) &&
        !(result.length > 0 && nx === result[result.length - 1][0] && ny === result[result.length - 1][1])
      ) {
        wrongNeighbors.push([nx, ny]);
      }
    }

    if (wrongNeighbors.length === 0) continue; // no viable wrong turn

    // Take wrong turn
    const wrongCell = wrongNeighbors[Math.floor(Math.random() * wrongNeighbors.length)];
    result.push(wrongCell);

    // BFS from wrong cell back to a later point on optimal path
    const rejoinPath = bfsToOptimalPath(
      state,
      wrongCell,
      optPath,
      devIdx + 1,
      new Set(result.map(([x, y]) => `${x},${y}`))
    );

    if (rejoinPath) {
      for (const cell of rejoinPath.path) {
        result.push(cell);
      }
      optIdx = rejoinPath.rejoinIndex + 1;
    } else {
      // Could not rejoin — just use optimal from here
      optIdx = devIdx + 1;
    }
  }

  // Copy remaining optimal path
  while (optIdx < optPath.length) {
    // Avoid duplicate of last pushed cell
    const last = result[result.length - 1];
    if (!(last[0] === optPath[optIdx][0] && last[1] === optPath[optIdx][1])) {
      result.push(optPath[optIdx]);
    }
    optIdx++;
  }

  return result;
}

/**
 * BFS from a cell back to any cell on optimalPath at index >= minIndex.
 * Returns the path and rejoin index, or null if unreachable.
 */
function bfsToOptimalPath(
  state: QuantumAgentState,
  from: [number, number],
  optimalPath: [number, number][],
  minIndex: number,
  visited: Set<string>
): { path: [number, number][]; rejoinIndex: number } | null {
  const optSet = new Map<string, number>();
  for (let i = minIndex; i < optimalPath.length; i++) {
    optSet.set(`${optimalPath[i][0]},${optimalPath[i][1]}`, i);
  }

  const bfsVisited = new Set<string>(visited);
  const parent = new Map<string, string>();
  const queue: [number, number][] = [from];
  const startKey = `${from[0]},${from[1]}`;
  bfsVisited.add(startKey);

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const key = `${cx},${cy}`;

    // Check if we've reached the optimal path
    if (key !== startKey && optSet.has(key)) {
      // Reconstruct path from `from` to here (excluding `from` since it's already in result)
      const path: [number, number][] = [];
      let cur = key;
      while (cur !== startKey) {
        const [px, py] = cur.split(',').map(Number);
        path.unshift([px, py] as [number, number]);
        cur = parent.get(cur)!;
      }
      return { path, rejoinIndex: optSet.get(key)! };
    }

    for (const dir of AllDirections) {
      const [dx, dy] = DirectionDelta[dir];
      const nx = cx + dx;
      const ny = cy + dy;
      const nKey = `${nx},${ny}`;
      if (state.waveFrontier.has(nKey) && !bfsVisited.has(nKey)) {
        bfsVisited.add(nKey);
        parent.set(nKey, key);
        queue.push([nx, ny]);
      }
    }
  }

  return null;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: PASS (all 26 tests)

**Step 5: Commit**

```bash
git add src/game/quantumAgent.ts src/game/__tests__/quantumAgent.test.ts
git commit -m "feat: add hold-to-charge and collapse algorithm with deviations"
```

---

### Task 7: Travel and phase transitions — `startTravel`, `tickTravel`

After collapse animation completes, the agent dot travels the resolved path cell by cell.

**Files:**
- Modify: `src/game/quantumAgent.ts`
- Modify: `src/game/__tests__/quantumAgent.test.ts`

**Step 1: Write the failing tests**

```ts
import { startTravel, tickTravel } from '../quantumAgent';

describe('startTravel', () => {
  it('transitions from collapsing to travelling', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    startCharge(state, 0, [50, 50]);
    updateCharge(state, 1000);
    collapse(state, 1000);
    startTravel(state, 1300); // 300ms after collapse
    expect(state.phase).toBe('travelling');
    expect(state.travelStartTime).toBe(1300);
    expect(state.travelIndex).toBe(0);
  });
});

describe('tickTravel', () => {
  it('advances travelIndex over time', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    startCharge(state, 0, [50, 50]);
    updateCharge(state, 1000);
    collapse(state, 1000);
    startTravel(state, 1300);
    // After 500ms at 100ms/cell, should have moved ~5 cells
    tickTravel(state, 1800);
    expect(state.travelIndex).toBeGreaterThan(0);
  });

  it('finishes when reaching end of collapsed path', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    tickExpansion(state, 1_000_000);
    startCharge(state, 0, [50, 50]);
    updateCharge(state, 1000);
    collapse(state, 1000);
    startTravel(state, 1300);
    // Advance far enough to finish
    tickTravel(state, 1300 + state.collapsedPath.length * 200);
    expect(state.phase).toBe('finished');
    expect(state.travelIndex).toBe(state.collapsedPath.length - 1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: FAIL — `startTravel`, `tickTravel` not found

**Step 3: Implement travel**

Add to `src/game/quantumAgent.ts`:

```ts
const TRAVEL_RATE = 100; // ms per cell
const COLLAPSE_DURATION = 300; // ms

/**
 * Transition from collapsing → travelling after collapse animation.
 */
export function startTravel(state: QuantumAgentState, now: number): void {
  if (state.phase !== 'collapsing') return;
  state.phase = 'travelling';
  state.travelStartTime = now;
  state.travelIndex = 0;
}

/**
 * Advance the agent dot along the collapsed path.
 */
export function tickTravel(state: QuantumAgentState, now: number): void {
  if (state.phase !== 'travelling') return;
  const elapsed = now - state.travelStartTime;
  const newIndex = Math.min(
    Math.floor(elapsed / TRAVEL_RATE),
    state.collapsedPath.length - 1
  );
  state.travelIndex = newIndex;

  if (newIndex >= state.collapsedPath.length - 1) {
    state.phase = 'finished';
  }
}

export { COLLAPSE_DURATION };
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/__tests__/quantumAgent.test.ts`
Expected: PASS (all 29 tests)

**Step 5: Commit**

```bash
git add src/game/quantumAgent.ts src/game/__tests__/quantumAgent.test.ts
git commit -m "feat: add travel phase with cell-by-cell animation"
```

---

### Task 8: Quantum renderer — `drawQuantumAgent`

Draws the wave cells, charge ring, collapsed path, and travelling agent dot.

**Files:**
- Create: `src/game/quantumRenderer.ts`

**Step 1: Implement the renderer**

No unit tests for canvas drawing (consistent with classical agent renderer pattern). Create `src/game/quantumRenderer.ts`:

```ts
import type { QuantumAgentState } from './quantumAgent';
import { COLLAPSE_DURATION } from './quantumAgent';
import { Colors } from './colors';

/**
 * Draw the quantum agent overlay: wave, charge ring, collapsed path, agent dot.
 */
export function drawQuantumAgent(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number,
  now: number
): void {
  const half = cellSize / 2;

  if (state.phase === 'expanding' || state.phase === 'charging') {
    drawWave(ctx, state, cellSize, half, now);
  }

  if (state.phase === 'charging') {
    drawChargeRing(ctx, state, cellSize);
  }

  if (state.phase === 'collapsing') {
    drawCollapseAnimation(ctx, state, cellSize, half, now);
  }

  if (state.phase === 'travelling' || state.phase === 'finished') {
    drawCollapsedPath(ctx, state, cellSize, half);
    if (state.phase === 'travelling') {
      drawTravellingDot(ctx, state, cellSize, half);
    }
  }
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number,
  half: number,
  now: number
): void {
  const inset = Math.floor(cellSize * 0.15);
  const size = cellSize - inset * 2;

  for (const [key, amplitude] of state.waveFrontier) {
    const [x, y] = key.split(',').map(Number);
    // Pulse: subtle oscillation based on amplitude
    const pulseFreq = 0.5 + amplitude * 2; // higher amp = faster pulse
    const pulse = 0.85 + 0.15 * Math.sin(now * 0.001 * pulseFreq * Math.PI * 2);
    const opacity = amplitude * 0.7 * pulse;

    ctx.fillStyle = `rgba(0, 229, 204, ${opacity})`;
    ctx.fillRect(x * cellSize + inset, y * cellSize + inset, size, size);
  }
}

function drawChargeRing(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number
): void {
  if (!state.fingerPosition) return;

  const [fx, fy] = state.fingerPosition;
  const radius = cellSize * 1.5;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * state.chargeLevel;

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(fx, fy, radius, startAngle, endAngle);
  ctx.stroke();

  // Inner glow
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * state.chargeLevel})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(fx, fy, radius, startAngle, endAngle);
  ctx.stroke();
}

function drawCollapseAnimation(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number,
  half: number,
  now: number
): void {
  const elapsed = now - state.collapseStartTime;
  const progress = Math.min(1, elapsed / COLLAPSE_DURATION);

  // Fade out wave cells not on collapsed path
  const pathSet = new Set(state.collapsedPath.map(([x, y]) => `${x},${y}`));
  const inset = Math.floor(cellSize * 0.15);
  const size = cellSize - inset * 2;

  for (const [key, amplitude] of state.waveFrontier) {
    const [x, y] = key.split(',').map(Number);
    const onPath = pathSet.has(key);
    const opacity = onPath
      ? amplitude * 0.7
      : amplitude * 0.7 * (1 - progress);

    if (opacity > 0.01) {
      ctx.fillStyle = `rgba(0, 229, 204, ${opacity})`;
      ctx.fillRect(x * cellSize + inset, y * cellSize + inset, size, size);
    }
  }

  // Fade in collapsed path
  if (progress > 0.3) {
    const pathProgress = (progress - 0.3) / 0.7;
    const isOptimal = state.collapsedPath.length === state.optimalPath.length &&
      state.collapsedPath.every(([x, y], i) =>
        x === state.optimalPath[i][0] && y === state.optimalPath[i][1]
      );
    const pathColor = isOptimal ? Colors.exitNode : Colors.quantumSuboptimal;
    drawPath(ctx, state.collapsedPath, pathColor, cellSize, half, pathProgress);
  }
}

function drawCollapsedPath(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number,
  half: number
): void {
  const isOptimal = state.collapsedPath.length === state.optimalPath.length &&
    state.collapsedPath.every(([x, y], i) =>
      x === state.optimalPath[i][0] && y === state.optimalPath[i][1]
    );
  const pathColor = isOptimal ? Colors.exitNode : Colors.quantumSuboptimal;
  drawPath(ctx, state.collapsedPath, pathColor, cellSize, half, 1);

  // If suboptimal, briefly show ghost of optimal path
  if (!isOptimal && state.phase === 'travelling' && state.travelIndex < 5) {
    drawPath(ctx, state.optimalPath, Colors.exitNode, cellSize, half, 1, 0.15);
  }
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  path: [number, number][],
  color: string,
  cellSize: number,
  half: number,
  progress: number,
  opacity: number = 1
): void {
  const len = Math.max(2, Math.floor(path.length * progress));
  ctx.strokeStyle = opacity < 1 ? withAlpha(color, opacity) : color;
  ctx.lineWidth = Math.max(2, Math.floor(cellSize * 0.15));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(path[0][0] * cellSize + half, path[0][1] * cellSize + half);
  for (let i = 1; i < len; i++) {
    ctx.lineTo(path[i][0] * cellSize + half, path[i][1] * cellSize + half);
  }
  ctx.stroke();
}

function drawTravellingDot(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number,
  half: number
): void {
  const [x, y] = state.collapsedPath[state.travelIndex];
  const radius = Math.floor(cellSize * 0.3);
  ctx.fillStyle = Colors.quantumWave;
  ctx.beginPath();
  ctx.arc(x * cellSize + half, y * cellSize + half, radius, 0, Math.PI * 2);
  ctx.fill();

  // Glow
  ctx.fillStyle = 'rgba(0, 229, 204, 0.2)';
  ctx.beginPath();
  ctx.arc(x * cellSize + half, y * cellSize + half, radius * 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
```

**Step 2: Commit**

```bash
git add src/game/quantumRenderer.ts
git commit -m "feat: add quantum wave and collapse renderer"
```

---

### Task 9: Integrate into MazeRenderer — hold gesture + quantum drawing

Modify `MazeRenderer.tsx` to accept quantum state, handle the hold-to-charge gesture, and draw quantum overlay.

**Files:**
- Modify: `src/components/MazeRenderer.tsx`

**Step 1: Add quantum imports and prop**

At the top of `MazeRenderer.tsx`, add:

```ts
import type { QuantumAgentState } from '../game/quantumAgent';
import {
  tickExpansion,
  startCharge,
  updateCharge,
  collapse,
  startTravel,
  tickTravel,
  COLLAPSE_DURATION,
} from '../game/quantumAgent';
import { drawQuantumAgent } from '../game/quantumRenderer';
```

Update the props interface:

```ts
interface MazeRendererProps {
  maze: MazeData;
  agentState?: ClassicalAgentState;
  quantumState?: QuantumAgentState;
}
```

**Step 2: Add quantum refs and expansion start time**

Inside the `MazeRenderer` function, add:

```ts
const quantumRef = useRef(quantumState);
quantumRef.current = quantumState;
const expansionStartRef = useRef<number | null>(null);
```

**Step 3: Modify touch handlers for quantum mode**

Replace the `handleTouchStart` callback to support quantum charging:

```ts
const handleTouchStart = useCallback((e: TouchEvent) => {
  e.preventDefault();
  const touch = e.touches[0];
  touchStartRef.current = { x: touch.clientX, y: touch.clientY };

  // Quantum charge start
  const qState = quantumRef.current;
  if (qState && qState.phase === 'expanding') {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const fingerX = touch.clientX - rect.left;
      const fingerY = touch.clientY - rect.top;
      startCharge(qState, performance.now(), [fingerX, fingerY]);
    }
  }
}, []);
```

Replace the `handleTouchEnd` callback to support quantum collapse:

```ts
const handleTouchEnd = useCallback((e: TouchEvent) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const qState = quantumRef.current;

  // Quantum collapse on release
  if (qState && qState.phase === 'charging') {
    collapse(qState, performance.now());
    touchStartRef.current = null;
    return;
  }

  // Classical agent touch handling (existing code)
  const agent = agentRef.current;
  const m = mazeRef.current;
  const layout = layoutRef.current;
  const canvas = canvasRef.current;
  const start = touchStartRef.current;

  if (!agent || !m || !layout || !canvas || !start) return;

  // ... (rest of existing classical touch logic stays the same)
}, []);
```

**Step 4: Modify the rAF loop to tick quantum state and draw**

In the `frame()` function, after drawing the classical agent, add quantum logic:

```ts
// Tick and draw quantum agent
const qState = quantumRef.current;
if (qState) {
  const now = performance.now();

  if (qState.phase === 'expanding') {
    if (expansionStartRef.current === null) {
      expansionStartRef.current = now;
    }
    tickExpansion(qState, now - expansionStartRef.current);
  }

  if (qState.phase === 'charging') {
    updateCharge(qState, now);
  }

  if (qState.phase === 'collapsing') {
    const elapsed = now - qState.collapseStartTime;
    if (elapsed >= COLLAPSE_DURATION) {
      startTravel(qState, now);
    }
  }

  if (qState.phase === 'travelling') {
    tickTravel(qState, now);
  }

  drawQuantumAgent(ctx, qState, cellSize, now);
}
```

**Step 5: Add `touchmove` handler to update finger position during charge**

Add a new handler:

```ts
const handleTouchMove = useCallback((e: TouchEvent) => {
  e.preventDefault();
  const qState = quantumRef.current;
  if (qState && qState.phase === 'charging') {
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      qState.fingerPosition = [touch.clientX - rect.left, touch.clientY - rect.top];
    }
  }
}, []);
```

Register it in the useEffect alongside the other touch events:

```ts
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
// ...in cleanup:
canvas.removeEventListener('touchmove', handleTouchMove);
```

Update the useEffect dependency array to include `handleTouchMove`.

**Step 6: Commit**

```bash
git add src/components/MazeRenderer.tsx
git commit -m "feat: integrate quantum state into MazeRenderer with hold gesture"
```

---

### Task 10: Route observe mode in App.tsx

Wire up the `observe` mode to create a quantum state and pass it to MazeRenderer. Enable the Observe & Collapse card in ModeSelect.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ModeSelect.tsx`

**Step 1: Update App.tsx to create quantum state for observe mode**

```ts
import { createQuantumState } from './game/quantumAgent';
import type { QuantumAgentState } from './game/quantumAgent';
```

Replace the game rendering section. Change:
- When `mode === 'observe'`, create a `QuantumAgentState` via `createQuantumState(maze)` and pass it as `quantumState` to `MazeRenderer`
- When `mode === 'race'`, pass the classical `agentState` as before

```ts
const [mode, setMode] = useState<GameMode>('race');
const maze = useMemo(() => generateMaze(25, 25, 42), []);
const agentState = useRef(createAgentState(maze));
const quantumState = useRef<QuantumAgentState | null>(null);

const handleSelectMode = useCallback((selectedMode: GameMode) => {
  setMode(selectedMode);
  if (selectedMode === 'observe') {
    quantumState.current = createQuantumState(maze);
  }
  setScreen('game');
}, [maze]);
```

In the game render:

```tsx
return (
  <div style={{ /* existing styles */ }}>
    <MazeRenderer
      maze={maze}
      agentState={mode === 'race' ? agentState.current : undefined}
      quantumState={mode === 'observe' ? quantumState.current ?? undefined : undefined}
    />
  </div>
);
```

**Step 2: Enable Observe & Collapse in ModeSelect**

In `src/components/ModeSelect.tsx`, change the second `ModeCard` from `available={false}` to `available`:

```tsx
<ModeCard
  title="Observe & Collapse"
  description="Guide a quantum wave. Hold to charge, release to collapse."
  color={Colors.exitNode}
  available
  onSelect={handleObserve}
/>
```

**Step 3: Commit**

```bash
git add src/App.tsx src/components/ModeSelect.tsx
git commit -m "feat: route observe mode to quantum agent, enable mode selection"
```

---

### Task 11: Build, sync, and verify

Final verification: all tests pass, build succeeds, iOS sync.

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (25 existing + ~17 new quantum tests)

**Step 2: Build**

Run: `npm run build`
Expected: No TypeScript or build errors

**Step 3: Sync to iOS**

Run: `npx cap sync ios`
Expected: Clean sync

**Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: build and sync for observe & collapse mode"
```

**Step 5: Push**

```bash
git push origin main
```
