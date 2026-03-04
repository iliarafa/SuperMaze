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
