import type { PathCell, ClassicalAgentState } from './classicalAgent';
import { Colors } from './colors';

/**
 * Draw the classical agent overlay: path trace, dead end markers, and cursor.
 */
export function drawClassicalAgent(
  ctx: CanvasRenderingContext2D,
  state: ClassicalAgentState,
  cellSize: number
): void {
  const half = cellSize / 2;

  // Draw path trace (backtracked first, then active on top)
  drawPathSegments(ctx, state.path, 'backtracked', Colors.classicalBacktrack, cellSize, half);
  drawPathSegments(ctx, state.path, 'active', Colors.classicalPath, cellSize, half);

  // Draw dead end markers
  ctx.strokeStyle = Colors.classicalBacktrack;
  ctx.lineWidth = 2;
  const xSize = Math.floor(cellSize * 0.2);
  for (const key of state.deadEnds) {
    const [dx, dy] = key.split(',').map(Number);
    const cx = dx * cellSize + half;
    const cy = dy * cellSize + half;
    ctx.beginPath();
    ctx.moveTo(cx - xSize, cy - xSize);
    ctx.lineTo(cx + xSize, cy + xSize);
    ctx.moveTo(cx + xSize, cy - xSize);
    ctx.lineTo(cx - xSize, cy + xSize);
    ctx.stroke();
  }

  // Draw cursor (red circle at current position)
  const [px, py] = state.position;
  const cursorRadius = Math.floor(cellSize * 0.3);
  ctx.fillStyle = Colors.classicalCursor;
  ctx.beginPath();
  ctx.arc(px * cellSize + half, py * cellSize + half, cursorRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPathSegments(
  ctx: CanvasRenderingContext2D,
  path: PathCell[],
  targetState: 'active' | 'backtracked',
  color: string,
  cellSize: number,
  half: number
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, Math.floor(cellSize * 0.25));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < path.length; i++) {
    if (path[i].state !== targetState) continue;
    // Draw segment from path[i-1] to path[i]
    const prev = path[i - 1];
    const curr = path[i];
    ctx.beginPath();
    ctx.moveTo(prev.x * cellSize + half, prev.y * cellSize + half);
    ctx.lineTo(curr.x * cellSize + half, curr.y * cellSize + half);
    ctx.stroke();
  }
}
