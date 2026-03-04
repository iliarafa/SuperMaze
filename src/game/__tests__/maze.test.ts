import { describe, it, expect } from 'vitest';
import { generateMaze, MazeData, Direction, cellIndex } from '../maze';

describe('generateMaze', () => {
  it('produces a maze with correct dimensions', () => {
    const maze = generateMaze(25, 25, 42);
    expect(maze.width).toBe(25);
    expect(maze.height).toBe(25);
    expect(maze.cells.length).toBe(625);
  });

  it('sets start at (0,0) and exit at (width-1, height-1)', () => {
    const maze = generateMaze(25, 25, 42);
    expect(maze.start).toEqual([0, 0]);
    expect(maze.exit).toEqual([24, 24]);
  });

  it('is deterministic — same seed produces same maze', () => {
    const maze1 = generateMaze(25, 25, 42);
    const maze2 = generateMaze(25, 25, 42);
    expect(Array.from(maze1.cells)).toEqual(Array.from(maze2.cells));
  });

  it('produces different mazes for different seeds', () => {
    const maze1 = generateMaze(25, 25, 1);
    const maze2 = generateMaze(25, 25, 2);
    expect(Array.from(maze1.cells)).not.toEqual(Array.from(maze2.cells));
  });

  it('every cell is reachable (perfect maze — no isolated cells)', () => {
    const maze = generateMaze(15, 15, 99);
    // BFS from start — every cell should be visited
    const visited = new Set<number>();
    const queue: [number, number][] = [maze.start];
    visited.add(cellIndex(maze.width, maze.start[0], maze.start[1]));

    const dirDeltas: [number, number, number][] = [
      [Direction.N, 0, -1],
      [Direction.S, 0, 1],
      [Direction.E, 1, 0],
      [Direction.W, -1, 0],
    ];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      const cell = maze.cells[cellIndex(maze.width, cx, cy)];
      for (const [dir, dx, dy] of dirDeltas) {
        if (cell & dir) {
          const nx = cx + dx;
          const ny = cy + dy;
          const ni = cellIndex(maze.width, nx, ny);
          if (!visited.has(ni)) {
            visited.add(ni);
            queue.push([nx, ny]);
          }
        }
      }
    }

    expect(visited.size).toBe(maze.width * maze.height);
  });

  it('walls are consistent between adjacent cells', () => {
    const maze = generateMaze(10, 10, 7);
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = maze.cells[cellIndex(maze.width, x, y)];
        // If cell has N open, cell above must have S open
        if (y > 0 && (cell & Direction.N)) {
          const above = maze.cells[cellIndex(maze.width, x, y - 1)];
          expect(above & Direction.S).toBeTruthy();
        }
        // If cell has E open, cell right must have W open
        if (x < maze.width - 1 && (cell & Direction.E)) {
          const right = maze.cells[cellIndex(maze.width, x + 1, y)];
          expect(right & Direction.W).toBeTruthy();
        }
      }
    }
  });
});
