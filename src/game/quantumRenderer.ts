import type { QuantumAgentState } from './quantumAgent';
import { COLLAPSE_DURATION } from './quantumAgent';
import { Colors } from './colors';

/**
 * Draw the quantum agent overlay: wave, charge ring, collapsed path, agent dot.
 */
export function drawQuantumAgent(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number,
  now: number
): void {
  const half = cellSize / 2;

  if (state.phase === 'expanding' || state.phase === 'charging') {
    drawWave(ctx, state, cellSize, now);
  }

  if (state.phase === 'charging') {
    drawChargeRing(ctx, state, cellSize);
  }

  if (state.phase === 'collapsing') {
    drawCollapseAnimation(ctx, state, cellSize, half, now);
  }

  if (state.phase === 'travelling' || state.phase === 'finished') {
    drawCollapsedPath(ctx, state, cellSize, half);
    if (state.phase === 'travelling') {
      drawTravellingDot(ctx, state, cellSize, half);
    }
  }
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number,
  now: number
): void {
  const inset = Math.floor(cellSize * 0.15);
  const size = cellSize - inset * 2;

  for (const [key, amplitude] of state.waveFrontier) {
    const [x, y] = key.split(',').map(Number);
    // Pulse: subtle oscillation based on amplitude
    const pulseFreq = 0.5 + amplitude * 2;
    const pulse = 0.85 + 0.15 * Math.sin(now * 0.001 * pulseFreq * Math.PI * 2);
    const opacity = amplitude * 0.7 * pulse;

    ctx.fillStyle = `rgba(0, 229, 204, ${opacity})`;
    ctx.fillRect(x * cellSize + inset, y * cellSize + inset, size, size);
  }
}

function drawChargeRing(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number
): void {
  if (!state.fingerPosition) return;

  const [fx, fy] = state.fingerPosition;
  const radius = cellSize * 1.5;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * state.chargeLevel;

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(fx, fy, radius, startAngle, endAngle);
  ctx.stroke();

  // Inner glow
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * state.chargeLevel})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(fx, fy, radius, startAngle, endAngle);
  ctx.stroke();
}

function drawCollapseAnimation(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number,
  half: number,
  now: number
): void {
  const elapsed = now - state.collapseStartTime;
  const progress = Math.min(1, elapsed / COLLAPSE_DURATION);

  // Fade out wave cells not on collapsed path
  const pathSet = new Set(state.collapsedPath.map(([x, y]) => `${x},${y}`));
  const inset = Math.floor(cellSize * 0.15);
  const size = cellSize - inset * 2;

  for (const [key, amplitude] of state.waveFrontier) {
    const [x, y] = key.split(',').map(Number);
    const onPath = pathSet.has(key);
    const opacity = onPath
      ? amplitude * 0.7
      : amplitude * 0.7 * (1 - progress);

    if (opacity > 0.01) {
      ctx.fillStyle = `rgba(0, 229, 204, ${opacity})`;
      ctx.fillRect(x * cellSize + inset, y * cellSize + inset, size, size);
    }
  }

  // Fade in collapsed path
  if (progress > 0.3) {
    const pathProgress = (progress - 0.3) / 0.7;
    const isOptimal = isOptimalPath(state);
    const pathColor = isOptimal ? Colors.exitNode : Colors.quantumSuboptimal;
    drawPath(ctx, state.collapsedPath, pathColor, cellSize, half, pathProgress);
  }
}

function drawCollapsedPath(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number,
  half: number
): void {
  const isOpt = isOptimalPath(state);
  const pathColor = isOpt ? Colors.exitNode : Colors.quantumSuboptimal;
  drawPath(ctx, state.collapsedPath, pathColor, cellSize, half, 1);

  // If suboptimal, briefly show ghost of optimal path
  if (!isOpt && state.phase === 'travelling' && state.travelIndex < 5) {
    drawPath(ctx, state.optimalPath, Colors.exitNode, cellSize, half, 1, 0.15);
  }
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  path: [number, number][],
  color: string,
  cellSize: number,
  half: number,
  progress: number,
  opacity: number = 1
): void {
  const len = Math.max(2, Math.floor(path.length * progress));
  ctx.strokeStyle = opacity < 1 ? withAlpha(color, opacity) : color;
  ctx.lineWidth = Math.max(2, Math.floor(cellSize * 0.15));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(path[0][0] * cellSize + half, path[0][1] * cellSize + half);
  for (let i = 1; i < len; i++) {
    ctx.lineTo(path[i][0] * cellSize + half, path[i][1] * cellSize + half);
  }
  ctx.stroke();
}

function drawTravellingDot(
  ctx: CanvasRenderingContext2D,
  state: QuantumAgentState,
  cellSize: number,
  half: number
): void {
  const [x, y] = state.collapsedPath[state.travelIndex];
  const radius = Math.floor(cellSize * 0.3);
  ctx.fillStyle = Colors.quantumWave;
  ctx.beginPath();
  ctx.arc(x * cellSize + half, y * cellSize + half, radius, 0, Math.PI * 2);
  ctx.fill();

  // Glow
  ctx.fillStyle = 'rgba(0, 229, 204, 0.2)';
  ctx.beginPath();
  ctx.arc(x * cellSize + half, y * cellSize + half, radius * 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function isOptimalPath(state: QuantumAgentState): boolean {
  return (
    state.collapsedPath.length === state.optimalPath.length &&
    state.collapsedPath.every(
      ([x, y], i) => x === state.optimalPath[i][0] && y === state.optimalPath[i][1]
    )
  );
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
