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
