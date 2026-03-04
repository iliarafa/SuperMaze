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
