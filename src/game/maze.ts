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
