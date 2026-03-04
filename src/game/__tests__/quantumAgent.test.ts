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
