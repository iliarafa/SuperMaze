import { MazeData, Direction, DirectionDelta, cellIndex } from './maze';

export interface PathCell {
  x: number;
  y: number;
  state: 'active' | 'backtracked';
}

export interface ClassicalAgentState {
  position: [number, number];
  path: PathCell[];
  deadEnds: Set<string>;
  moveCount: number;
  finished: boolean;
}

export function createAgentState(maze: MazeData): ClassicalAgentState {
  const [sx, sy] = maze.start;
  return {
    position: [sx, sy],
    path: [{ x: sx, y: sy, state: 'active' }],
    deadEnds: new Set(),
    moveCount: 0,
    finished: false,
  };
}

/**
 * Attempt to move the agent in the given direction.
 * Returns true if the move was valid and executed, false otherwise.
 * Mutates the state in place.
 */
export function moveAgent(
  state: ClassicalAgentState,
  maze: MazeData,
  direction: number
): boolean {
  if (state.finished) return false;

  const [x, y] = state.position;
  const cell = maze.cells[cellIndex(maze.width, x, y)];

  // Check if passage exists in this direction
  if (!(cell & direction)) return false;

  const [dx, dy] = DirectionDelta[direction];
  const nx = x + dx;
  const ny = y + dy;

  // Bounds check
  if (nx < 0 || nx >= maze.width || ny < 0 || ny >= maze.height) return false;

  // Check if we're revisiting an active cell in the path (backtrack)
  const existingIndex = state.path.findIndex(
    (c) => c.x === nx && c.y === ny && c.state === 'active'
  );

  if (existingIndex !== -1) {
    // Backtracking: mark everything after existingIndex as backtracked
    const backtrackFrom = state.position;
    for (let i = existingIndex + 1; i < state.path.length; i++) {
      if (state.path[i].state === 'active') {
        state.path[i].state = 'backtracked';
      }
    }

    // Dead end detection: check if the cell we're leaving has
    // any open neighbors not yet in the path
    checkDeadEnd(state, maze, backtrackFrom[0], backtrackFrom[1]);
  }

  // Add new position to path
  state.path.push({ x: nx, y: ny, state: 'active' });
  state.position = [nx, ny];
  state.moveCount++;

  // Check win condition
  if (nx === maze.exit[0] && ny === maze.exit[1]) {
    state.finished = true;
  }

  return true;
}

function checkDeadEnd(
  state: ClassicalAgentState,
  maze: MazeData,
  cx: number,
  cy: number
): void {
  const cell = maze.cells[cellIndex(maze.width, cx, cy)];
  const directions = [Direction.N, Direction.S, Direction.E, Direction.W];
  const pathSet = new Set(state.path.map((c) => `${c.x},${c.y}`));

  for (const dir of directions) {
    if (!(cell & dir)) continue; // wall — skip
    const [dx, dy] = DirectionDelta[dir];
    const nx = cx + dx;
    const ny = cy + dy;
    if (!pathSet.has(`${nx},${ny}`)) {
      // There's an unvisited open neighbor — not a dead end
      return;
    }
  }

  // All open neighbors are in the path — this is a dead end
  state.deadEnds.add(`${cx},${cy}`);
}
