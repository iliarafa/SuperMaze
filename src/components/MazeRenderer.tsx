import { useRef, useEffect, useCallback } from 'react';
import type { MazeData } from '../game/maze';
import { cellIndex, Direction } from '../game/maze';
import { Colors } from '../game/colors';
import type { ClassicalAgentState } from '../game/classicalAgent';
import { moveAgent } from '../game/classicalAgent';
import { drawClassicalAgent } from '../game/agentRenderer';
import { detectSwipeDirection, touchToCell } from '../game/touchInput';
import type { QuantumAgentState } from '../game/quantumAgent';
import {
  tickExpansion,
  startCharge,
  updateCharge,
  collapse,
  startTravel,
  tickTravel,
  COLLAPSE_DURATION,
} from '../game/quantumAgent';
import { drawQuantumAgent } from '../game/quantumRenderer';

interface MazeRendererProps {
  maze: MazeData;
  agentState?: ClassicalAgentState;
  quantumState?: QuantumAgentState;
}

function computeLayout(maze: MazeData) {
  const dpr = window.devicePixelRatio || 1;
  const containerSize = Math.min(window.innerWidth, window.innerHeight) - 32;
  const cellSize = Math.floor(containerSize / maze.width);
  const mazePixelSize = cellSize * maze.width;
  return { dpr, cellSize, mazePixelSize };
}

function drawMazeToCanvas(
  ctx: CanvasRenderingContext2D,
  maze: MazeData,
  cellSize: number,
  mazePixelSize: number
): void {
  ctx.fillStyle = Colors.background;
  ctx.fillRect(0, 0, mazePixelSize, mazePixelSize);

  const nodeInset = Math.floor(cellSize * 0.2);
  const nodeSize = cellSize - nodeInset * 2;

  ctx.fillStyle = Colors.startNode;
  const [sx, sy] = maze.start;
  ctx.fillRect(sx * cellSize + nodeInset, sy * cellSize + nodeInset, nodeSize, nodeSize);

  ctx.fillStyle = Colors.exitNode;
  const [ex, ey] = maze.exit;
  ctx.fillRect(ex * cellSize + nodeInset, ey * cellSize + nodeInset, nodeSize, nodeSize);

  ctx.strokeStyle = Colors.wall;
  ctx.lineWidth = 2;
  ctx.lineCap = 'square';

  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      const cell = maze.cells[cellIndex(maze.width, x, y)];
      const px = x * cellSize;
      const py = y * cellSize;

      if (!(cell & Direction.N)) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + cellSize, py);
        ctx.stroke();
      }

      if (!(cell & Direction.W)) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + cellSize);
        ctx.stroke();
      }

      if (y === maze.height - 1 && !(cell & Direction.S)) {
        ctx.beginPath();
        ctx.moveTo(px, py + cellSize);
        ctx.lineTo(px + cellSize, py + cellSize);
        ctx.stroke();
      }

      if (x === maze.width - 1 && !(cell & Direction.E)) {
        ctx.beginPath();
        ctx.moveTo(px + cellSize, py);
        ctx.lineTo(px + cellSize, py + cellSize);
        ctx.stroke();
      }
    }
  }

  ctx.beginPath();
  ctx.moveTo(0, mazePixelSize);
  ctx.lineTo(mazePixelSize, mazePixelSize);
  ctx.lineTo(mazePixelSize, 0);
  ctx.stroke();
}

export function MazeRenderer({ maze, agentState, quantumState }: MazeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const layoutRef = useRef<ReturnType<typeof computeLayout> | null>(null);
  const mazeRef = useRef(maze);
  const agentRef = useRef(agentState);
  const quantumRef = useRef(quantumState);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const expansionStartRef = useRef<number | null>(null);

  // Keep refs in sync
  agentRef.current = agentState;
  quantumRef.current = quantumState;
  mazeRef.current = maze;

  // Rebuild offscreen canvas when maze changes
  useEffect(() => {
    const layout = computeLayout(maze);
    layoutRef.current = layout;
    const { dpr, cellSize, mazePixelSize } = layout;

    const offscreen = document.createElement('canvas');
    offscreen.width = mazePixelSize * dpr;
    offscreen.height = mazePixelSize * dpr;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.scale(dpr, dpr);
    drawMazeToCanvas(offCtx, maze, cellSize, mazePixelSize);
    offscreenRef.current = offscreen;
  }, [maze]);

  // Touch handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };

    // Quantum charge start
    const qState = quantumRef.current;
    if (qState && qState.phase === 'expanding') {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const fingerX = touch.clientX - rect.left;
        const fingerY = touch.clientY - rect.top;
        startCharge(qState, performance.now(), [fingerX, fingerY]);
      }
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const qState = quantumRef.current;
    if (qState && qState.phase === 'charging') {
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        qState.fingerPosition = [touch.clientX - rect.left, touch.clientY - rect.top];
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const qState = quantumRef.current;

    // Quantum collapse on release
    if (qState && qState.phase === 'charging') {
      collapse(qState, performance.now());
      touchStartRef.current = null;
      return;
    }

    // Classical agent touch handling
    const agent = agentRef.current;
    const m = mazeRef.current;
    const layout = layoutRef.current;
    const canvas = canvasRef.current;
    const start = touchStartRef.current;

    if (!agent || !m || !layout || !canvas || !start) return;

    const endX = touch.clientX;
    const endY = touch.clientY;

    // Try swipe first
    const swipeDir = detectSwipeDirection(start.x, start.y, endX, endY);
    if (swipeDir !== null) {
      moveAgent(agent, m, swipeDir);
      touchStartRef.current = null;
      return;
    }

    // Fall back to tap: map to cell, check adjacency, move
    const rect = canvas.getBoundingClientRect();
    const tapX = endX - rect.left;
    const tapY = endY - rect.top;
    const cell = touchToCell(
      tapX, tapY,
      layout.cellSize,
      0, 0,
      m.width, m.height
    );

    if (cell) {
      const [cx, cy] = cell;
      const [ax, ay] = agent.position;
      const dx = cx - ax;
      const dy = cy - ay;

      // Only allow adjacent cell taps (manhattan distance 1)
      if (Math.abs(dx) + Math.abs(dy) === 1) {
        let dir: number | null = null;
        if (dx === 1) dir = Direction.E;
        else if (dx === -1) dir = Direction.W;
        else if (dy === 1) dir = Direction.S;
        else if (dy === -1) dir = Direction.N;

        if (dir !== null) {
          moveAgent(agent, m, dir);
        }
      }
    }

    touchStartRef.current = null;
  }, []);

  // Set up canvas, touch events, and rAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    function frame() {
      const layout = layoutRef.current;
      const offscreen = offscreenRef.current;
      if (!layout || !offscreen || !ctx || !canvas) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const { dpr, cellSize, mazePixelSize } = layout;

      canvas.style.width = `${mazePixelSize}px`;
      canvas.style.height = `${mazePixelSize}px`;
      if (canvas.width !== mazePixelSize * dpr) {
        canvas.width = mazePixelSize * dpr;
        canvas.height = mazePixelSize * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Draw cached maze
      ctx.drawImage(offscreen, 0, 0, mazePixelSize, mazePixelSize);

      // Draw classical agent overlay
      const agent = agentRef.current;
      if (agent) {
        drawClassicalAgent(ctx, agent, cellSize);
      }

      // Tick and draw quantum agent
      const qState = quantumRef.current;
      if (qState) {
        const now = performance.now();

        if (qState.phase === 'expanding') {
          if (expansionStartRef.current === null) {
            expansionStartRef.current = now;
          }
          tickExpansion(qState, now - expansionStartRef.current);
        }

        if (qState.phase === 'charging') {
          updateCharge(qState, now);
        }

        if (qState.phase === 'collapsing') {
          const elapsed = now - qState.collapseStartTime;
          if (elapsed >= COLLAPSE_DURATION) {
            startTravel(qState, now);
          }
        }

        if (qState.phase === 'travelling') {
          tickTravel(qState, now);
        }

        drawQuantumAgent(ctx, qState, cellSize, now);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return <canvas ref={canvasRef} style={{ touchAction: 'none' }} />;
}
