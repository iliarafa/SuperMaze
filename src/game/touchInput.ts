import { Direction } from './maze';

const SWIPE_THRESHOLD = 20;

/**
 * Detect swipe direction from start/end touch coordinates.
 * Returns a Direction value or null if below threshold.
 */
export function detectSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): number | null {
  const dx = endX - startX;
  const dy = endY - startY;

  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
    return null;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? Direction.E : Direction.W;
  } else {
    return dy > 0 ? Direction.S : Direction.N;
  }
}

/**
 * Map a touch position to a maze cell coordinate.
 * Returns [x, y] or null if outside the maze.
 */
export function touchToCell(
  touchX: number,
  touchY: number,
  cellSize: number,
  mazeOffsetX: number,
  mazeOffsetY: number,
  mazeWidth: number,
  mazeHeight: number
): [number, number] | null {
  const relX = touchX - mazeOffsetX;
  const relY = touchY - mazeOffsetY;

  if (relX < 0 || relY < 0) return null;

  const cx = Math.floor(relX / cellSize);
  const cy = Math.floor(relY / cellSize);

  if (cx >= mazeWidth || cy >= mazeHeight) return null;

  return [cx, cy];
}
