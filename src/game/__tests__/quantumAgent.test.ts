import { describe, it, expect } from 'vitest';
import { generateMaze, cellIndex, Direction } from '../maze';
import type { MazeData } from '../maze';
import { bfsPath, bfsDistanceMap, computeAmplitudes, createQuantumState, tickExpansion } from '../quantumAgent';

const AllDirections = [Direction.N, Direction.S, Direction.E, Direction.W];

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

  it('each step goes through an open passage', () => {
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
        expect(amp === 0.3 || amp === 0.1).toBe(true);
      }
    }
  });

  it('assigns 0.1 to dead ends (cells with only 1 open neighbor)', () => {
    const maze = makeTestMaze();
    const path = bfsPath(maze);
    const pathSet = new Set(path.map(([x, y]) => `${x},${y}`));
    const amps = computeAmplitudes(maze, path);
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = maze.cells[cellIndex(maze.width, x, y)];
        const openCount = AllDirections.filter((d) => (cell & d) !== 0).length;
        const key = `${x},${y}`;
        if (openCount === 1 && !pathSet.has(key)) {
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

  it('expandQueue covers all cells with non-negative delays', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    expect(state.expandQueue.length).toBe(maze.width * maze.height);
    for (const item of state.expandQueue) {
      expect(item.delay).toBeGreaterThanOrEqual(0);
    }
  });

  it('expandQueue starts from the maze start cell', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
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

describe('tickExpansion', () => {
  it('adds cells to waveFrontier as time passes', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
    tickExpansion(state, 500);
    expect(state.waveFrontier.size).toBeGreaterThan(0);
    expect(state.expandedCount).toBe(state.waveFrontier.size);
  });

  it('does not expand beyond the queue', () => {
    const maze = makeTestMaze();
    const state = createQuantumState(maze);
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
