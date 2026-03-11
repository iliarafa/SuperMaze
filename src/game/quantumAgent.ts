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
 * BFS biased toward the player's cells. When multiple neighbors are valid,
 * directions leading into the player's cell set are explored first so that
 * the reconstructed shortest path aligns with the player's route.
 */
export function bfsPathBiased(
  maze: MazeData,
  playerCells: Set<string>
): [number, number][] {
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
    // Sort directions so player-cell neighbors come first
    const dirs = [...AllDirections].sort((a, b) => {
      const [adx, ady] = DirectionDelta[a];
      const [bdx, bdy] = DirectionDelta[b];
      const aInPlayer = playerCells.has(`${cx + adx},${cy + ady}`) ? 0 : 1;
      const bInPlayer = playerCells.has(`${cx + bdx},${cy + bdy}`) ? 0 : 1;
      return aInPlayer - bInPlayer;
    });
    for (const dir of dirs) {
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

const MAX_ALT_PATHS = 10;

/**
 * Find all shortest paths from start to exit (up to MAX_ALT_PATHS).
 * Uses BFS with multi-parent tracking, then DFS enumeration on the parent DAG.
 */
export function findAllShortestPaths(
  maze: MazeData,
  maxPaths: number = MAX_ALT_PATHS
): [number, number][][] {
  const { width, height, start, exit } = maze;
  const totalCells = width * height;
  const dist = new Int32Array(totalCells).fill(-1);
  const allParents = new Map<number, number[]>();
  const si = cellIndex(width, start[0], start[1]);
  const ei = cellIndex(width, exit[0], exit[1]);
  dist[si] = 0;
  const queue: number[] = [si];

  while (queue.length > 0) {
    const ci = queue.shift()!;
    const cx = ci % width;
    const cy = (ci - cx) / width;
    const cell = maze.cells[ci];

    for (const dir of AllDirections) {
      if (!(cell & dir)) continue;
      const [dx, dy] = DirectionDelta[dir];
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const ni = cellIndex(width, nx, ny);
      const nd = dist[ci] + 1;
      if (dist[ni] === -1) {
        dist[ni] = nd;
        allParents.set(ni, [ci]);
        queue.push(ni);
      } else if (dist[ni] === nd) {
        allParents.get(ni)!.push(ci);
      }
    }
  }

  if (dist[ei] === -1) return [];

  // DFS backwards from exit through parent DAG
  const results: [number, number][][] = [];
  const stack: { cell: number; path: number[] }[] = [{ cell: ei, path: [ei] }];

  while (stack.length > 0 && results.length < maxPaths) {
    const { cell, path } = stack.pop()!;
    if (cell === si) {
      const coords: [number, number][] = [];
      for (let i = path.length - 1; i >= 0; i--) {
        const c = path[i];
        coords.push([c % width, (c - (c % width)) / width]);
      }
      results.push(coords);
      continue;
    }
    const parents = allParents.get(cell);
    if (parents) {
      for (const p of parents) {
        stack.push({ cell: p, path: [...path, p] });
      }
    }
  }

  return results;
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
  maze: MazeData;
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
    maze,
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

  // Find junctions: optimal path cells with off-path open neighbors (wall-checked)
  const { maze } = state;
  const junctionIndices: number[] = [];
  for (let i = 1; i < optPath.length - 1; i++) {
    const [x, y] = optPath[i];
    const cell = maze.cells[cellIndex(maze.width, x, y)];
    const prevKey = `${optPath[i - 1][0]},${optPath[i - 1][1]}`;
    const nextKey = `${optPath[i + 1][0]},${optPath[i + 1][1]}`;
    let offPathNeighbors = 0;
    for (const dir of AllDirections) {
      if (!(cell & dir)) continue; // wall — skip
      const [dx, dy] = DirectionDelta[dir];
      const nx = x + dx;
      const ny = y + dy;
      const nKey = `${nx},${ny}`;
      if (nKey !== prevKey && nKey !== nextKey) {
        offPathNeighbors++;
      }
    }
    if (offPathNeighbors > 0) {
      junctionIndices.push(i);
    }
  }

  // Cap deviations at available junctions
  const actualDeviations = Math.min(maxDeviations, junctionIndices.length);
  if (actualDeviations === 0) {
    return [...optPath];
  }

  // Randomly select junction indices
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
    // Skip if we've already passed this junction (prior rejoin jumped ahead)
    if (devIdx < optIdx) continue;

    // Copy optimal path up to deviation point
    while (optIdx <= devIdx) {
      result.push(optPath[optIdx]);
      optIdx++;
    }

    // Take a wrong turn — must check wall passages
    const [jx, jy] = optPath[devIdx];
    const jCell = maze.cells[cellIndex(maze.width, jx, jy)];
    const nextOpt = optPath[devIdx + 1];
    const wrongNeighbors: [number, number][] = [];
    for (const dir of AllDirections) {
      if (!(jCell & dir)) continue; // wall — skip
      const [dx, dy] = DirectionDelta[dir];
      const nx = jx + dx;
      const ny = jy + dy;
      if (
        !(nx === nextOpt[0] && ny === nextOpt[1]) &&
        !(result.length > 0 && nx === result[result.length - 1][0] && ny === result[result.length - 1][1])
      ) {
        wrongNeighbors.push([nx, ny]);
      }
    }

    if (wrongNeighbors.length === 0) continue;

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
      // Can't rejoin — backtrack to junction and continue on optimal path
      result.push(optPath[devIdx]);
      optIdx = devIdx + 1;
    }
  }

  // Copy remaining optimal path
  while (optIdx < optPath.length) {
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

    if (key !== startKey && optSet.has(key)) {
      // Reconstruct path
      const path: [number, number][] = [];
      let cur = key;
      while (cur !== startKey) {
        const [px, py] = cur.split(',').map(Number);
        path.unshift([px, py] as [number, number]);
        cur = parent.get(cur)!;
      }
      return { path, rejoinIndex: optSet.get(key)! };
    }

    const cell = state.maze.cells[cellIndex(state.maze.width, cx, cy)];
    for (const dir of AllDirections) {
      if (!(cell & dir)) continue; // wall — skip
      const [dx, dy] = DirectionDelta[dir];
      const nx = cx + dx;
      const ny = cy + dy;
      const nKey = `${nx},${ny}`;
      if (!bfsVisited.has(nKey)) {
        bfsVisited.add(nKey);
        parent.set(nKey, key);
        queue.push([nx, ny]);
      }
    }
  }

  return null;
}

export const TRAVEL_RATE = 100; // ms per cell
export const COLLAPSE_DURATION = 300; // ms

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
