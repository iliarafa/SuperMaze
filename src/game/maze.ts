import { createRng } from './random';

export const Direction = {
  N: 1,
  S: 2,
  E: 4,
  W: 8,
} as const;

export const Opposite: Record<number, number> = {
  [Direction.N]: Direction.S,
  [Direction.S]: Direction.N,
  [Direction.E]: Direction.W,
  [Direction.W]: Direction.E,
};

export const DirectionDelta: Record<number, [number, number]> = {
  [Direction.N]: [0, -1],
  [Direction.S]: [0, 1],
  [Direction.E]: [1, 0],
  [Direction.W]: [-1, 0],
};

export interface MazeData {
  width: number;
  height: number;
  cells: Uint8Array;
  start: [number, number];
  exit: [number, number];
}

export function cellIndex(width: number, x: number, y: number): number {
  return y * width + x;
}

export function hasWall(maze: MazeData, x: number, y: number, dir: number): boolean {
  return (maze.cells[cellIndex(maze.width, x, y)] & dir) === 0;
}

export function generateMaze(width: number, height: number, seed: number): MazeData {
  const cells = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const rng = createRng(seed);

  const directions = [Direction.N, Direction.S, Direction.E, Direction.W];

  function carve(x: number, y: number): void {
    visited[cellIndex(width, x, y)] = 1;

    // Shuffle directions using Fisher-Yates
    const dirs = [...directions];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    for (const dir of dirs) {
      const [dx, dy] = DirectionDelta[dir];
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[cellIndex(width, nx, ny)]) {
        cells[cellIndex(width, x, y)] |= dir;
        cells[cellIndex(width, nx, ny)] |= Opposite[dir];
        carve(nx, ny);
      }
    }
  }

  carve(0, 0);

  return {
    width,
    height,
    cells,
    start: [0, 0],
    exit: [width - 1, height - 1],
  };
}
