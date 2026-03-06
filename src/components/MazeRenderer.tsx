import { useRef, useEffect, useCallback, useState } from 'react';
import type { MazeData } from '../game/maze';
import { cellIndex, Direction } from '../game/maze';
import { Colors, UIColors, UI_FONT } from '../game/colors';
import type { ClassicalAgentState } from '../game/classicalAgent';
import { moveAgent } from '../game/classicalAgent';
import { drawClassicalAgent } from '../game/agentRenderer';
import { detectSwipeDirection, touchToCell } from '../game/touchInput';
import type { QuantumAgentState } from '../game/quantumAgent';
import {
  createQuantumState,
  tickExpansion,
  startCharge,
  updateCharge,
  collapse,
  startTravel,
  tickTravel,
  COLLAPSE_DURATION,
  TRAVEL_RATE,
} from '../game/quantumAgent';
import { drawQuantumAgent, drawPath } from '../game/quantumRenderer';
import type { GameMode } from './ModeSelect';
import { SwipePad } from './SwipePad';
import { playSound } from '../game/audio';
import { useTiltMovement } from '../game/tiltInput';

type RacePhase = 'exploring' | 'quantumReveal' | 'comparison';

function moveWithSound(agent: ClassicalAgentState, maze: MazeData, direction: number): boolean {
  const activeCount = agent.path.filter(c => c.state === 'active').length;
  const moved = moveAgent(agent, maze, direction);
  if (!moved) return false;

  if (agent.finished) {
    playSound('win');
  } else {
    const newActiveCount = agent.path.filter(c => c.state === 'active').length;
    // If active count didn't increase by 1, cells were marked as backtracked
    playSound(newActiveCount > activeCount ? 'move' : 'backtrack');
  }
  return true;
}

interface ComparisonData {
  playerMoves: number;
  playerPathLength: number;
  optimalLength: number;
  deadEnds: number;
  playerTime: number;
  quantumTime: number;
}

interface MazeRendererProps {
  maze: MazeData;
  agentState?: ClassicalAgentState;
  quantumState?: QuantumAgentState;
  mode: GameMode;
  joystickEnabled?: boolean;
  tiltEnabled?: boolean;
  onBack?: () => void;
}

function computeLayout(maze: MazeData) {
  const dpr = window.devicePixelRatio || 1;
  const containerSize = Math.min(window.innerWidth, window.innerHeight) - 32;
  const cellSize = Math.floor(containerSize / maze.width);
  const mazePixelSize = cellSize * maze.width;
  return { dpr, cellSize, mazePixelSize };
}

function drawWalls(
  ctx: CanvasRenderingContext2D,
  maze: MazeData,
  cellSize: number,
  mazePixelSize: number,
  strokeStyle: string,
  lineWidth: number
): void {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
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

  // Start node: hollow square outline
  const [sx, sy] = maze.start;
  ctx.strokeStyle = Colors.startNode;
  ctx.lineWidth = 2;
  ctx.strokeRect(sx * cellSize + nodeInset, sy * cellSize + nodeInset, nodeSize, nodeSize);

  // Exit node: filled with glow
  const [ex, ey] = maze.exit;
  const glowInset = Math.floor(cellSize * 0.1);
  const glowSize = cellSize - glowInset * 2;
  ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
  ctx.fillRect(ex * cellSize + glowInset, ey * cellSize + glowInset, glowSize, glowSize);
  ctx.fillStyle = Colors.exitNode;
  ctx.fillRect(ex * cellSize + nodeInset, ey * cellSize + nodeInset, nodeSize, nodeSize);

  // Glow pass: wider, translucent walls
  drawWalls(ctx, maze, cellSize, mazePixelSize, Colors.wallGlow, 6);
  // Crisp pass: sharp walls on top
  drawWalls(ctx, maze, cellSize, mazePixelSize, Colors.wall, 2);
}

export function MazeRenderer({ maze, agentState, quantumState, mode, joystickEnabled, tiltEnabled, onBack }: MazeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const layoutRef = useRef<ReturnType<typeof computeLayout> | null>(null);
  const mazeRef = useRef(maze);
  const agentRef = useRef(agentState);
  const quantumRef = useRef(quantumState);
  const modeRef = useRef(mode);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const expansionStartRef = useRef<number | null>(null);
  const racePhaseRef = useRef<RacePhase>('exploring');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [headerText, setHeaderText] = useState<string>('human');

  // Keep refs in sync
  agentRef.current = agentState;
  if (quantumState !== undefined) {
    quantumRef.current = quantumState;
  }
  mazeRef.current = maze;
  modeRef.current = mode;

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

    // Quantum charge start (observe mode only)
    if (modeRef.current === 'observe') {
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
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (modeRef.current === 'observe') {
      const qState = quantumRef.current;
      if (qState && qState.phase === 'charging') {
        const touch = e.touches[0];
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          qState.fingerPosition = [touch.clientX - rect.left, touch.clientY - rect.top];
        }
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const qState = quantumRef.current;

    // Quantum collapse on release (observe mode only)
    if (modeRef.current === 'observe' && qState && qState.phase === 'charging') {
      collapse(qState, performance.now());
      playSound('quantum');
      touchStartRef.current = null;
      return;
    }

    // Disable classical input during quantum reveal / comparison in race mode
    if (modeRef.current === 'race' && racePhaseRef.current !== 'exploring') {
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
      moveWithSound(agent, m, swipeDir);
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
          moveWithSound(agent, m, dir);
        }
      }
    }

    touchStartRef.current = null;
  }, []);

  // Keyboard handler for arrow keys (classical agent)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (modeRef.current === 'race' && racePhaseRef.current !== 'exploring') return;
    const agent = agentRef.current;
    const m = mazeRef.current;
    if (!agent || !m) return;

    let dir: number | null = null;
    switch (e.key) {
      case 'ArrowUp': dir = Direction.N; break;
      case 'ArrowDown': dir = Direction.S; break;
      case 'ArrowLeft': dir = Direction.W; break;
      case 'ArrowRight': dir = Direction.E; break;
      default: return;
    }

    e.preventDefault();
    moveWithSound(agent, m, dir);
  }, []);

  // Swipe pad direction handler
  const handlePadDirection = useCallback((dir: number) => {
    if (modeRef.current === 'race' && racePhaseRef.current !== 'exploring') return;
    const agent = agentRef.current;
    const m = mazeRef.current;
    if (!agent || !m) return;
    moveWithSound(agent, m, dir);
  }, []);

  // Tilt control
  const tiltIsActive = !!(tiltEnabled && mode === 'race' && !comparisonData);
  const { calibrate: calibrateTilt } = useTiltMovement(tiltIsActive, handlePadDirection);

  // Set up canvas, touch events, keyboard events, and rAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!tiltIsActive) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    window.addEventListener('keydown', handleKeyDown);

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

      const now = performance.now();
      const currentMode = modeRef.current;
      const agent = agentRef.current;
      const isComparison = currentMode === 'race' && racePhaseRef.current === 'comparison';

      // Draw classical agent overlay (skip in comparison — we draw clean paths instead)
      if (agent && !isComparison) {
        drawClassicalAgent(ctx, agent, cellSize);
      }

      if (currentMode === 'race') {
        // Race mode: sequential phases
        const racePhase = racePhaseRef.current;

        if (racePhase === 'exploring' && agent?.finished) {
          // Player finished — start quantum reveal
          const qState = createQuantumState(mazeRef.current);
          quantumRef.current = qState;
          expansionStartRef.current = now;
          racePhaseRef.current = 'quantumReveal';
          setHeaderText('quantum');
        }

        if (racePhaseRef.current === 'quantumReveal') {
          const qState = quantumRef.current;
          if (qState && expansionStartRef.current !== null) {
            tickExpansion(qState, now - expansionStartRef.current);
            drawQuantumAgent(ctx, qState, cellSize, now);

            // Check if expansion is complete
            if (qState.expandQueue.length === 0) {
              qState.collapsedPath = [...qState.optimalPath];
              qState.phase = 'finished';
              playSound('quantum');
              racePhaseRef.current = 'comparison';
              if (agent) {
                const activePath = agent.path.filter(c => c.state === 'active');
                const playerLen = activePath.length - 1;
                const optimalLen = qState.optimalPath.length - 1;
                const playerTime = (agent.endTime ?? 0) - (agent.startTime ?? 0);
                const quantumTime = optimalLen * TRAVEL_RATE;
                setComparisonData({
                  playerMoves: agent.moveCount,
                  playerPathLength: playerLen,
                  optimalLength: optimalLen,
                  deadEnds: agent.deadEnds.size,
                  playerTime,
                  quantumTime,
                });
                const isOptimal = playerLen === optimalLen;
                const isFasterThanQuantum = isOptimal && playerTime <= quantumTime;
                setHeaderText(isFasterThanQuantum ? 'quantum is human' : isOptimal ? 'human is quantum' : 'human is human');
              }
            }
          }
        }

        if (racePhaseRef.current === 'comparison') {
          const qState = quantumRef.current;
          if (qState && agent) {
            const half = cellSize / 2;
            // Draw optimal path (wider, underneath)
            drawPath(ctx, qState.optimalPath, Colors.optimalPath, cellSize, half, 1, 0.7, 0.25);
            // Draw player's active path on top (thinner)
            const activeCells: [number, number][] = agent.path
              .filter(c => c.state === 'active')
              .map(c => [c.x, c.y]);
            drawPath(ctx, activeCells, Colors.classicalPath, cellSize, half, 1, 1, 0.12);
            // Draw overlap segments where player matched optimal
            const optimalSet = new Set(qState.optimalPath.map(([x, y]) => `${x},${y}`));
            const overlapRuns: [number, number][][] = [];
            let currentRun: [number, number][] = [];
            for (const cell of activeCells) {
              if (optimalSet.has(`${cell[0]},${cell[1]}`)) {
                currentRun.push(cell);
              } else {
                if (currentRun.length >= 2) overlapRuns.push(currentRun);
                currentRun = [];
              }
            }
            if (currentRun.length >= 2) overlapRuns.push(currentRun);
            for (const run of overlapRuns) {
              drawPath(ctx, run, Colors.overlapPath, cellSize, half, 1, 1, 0.12);
            }
          }
        }
      } else {
        // Observe mode: existing behavior unchanged
        const qState = quantumRef.current;
        if (qState) {
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
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleKeyDown, tiltIsActive]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2.5rem',
      }}
    >
      {/* Header — fixed height for 2 lines to prevent layout shift */}
      <div
        style={{
          fontFamily: UI_FONT,
          fontSize: '2rem',
          fontWeight: 400,
          letterSpacing: '0.15em',
          color: UIColors.highlight,
          textTransform: 'uppercase',
          minHeight: '4.8rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {mode === 'race' ? headerText : 'observe'}
      </div>

      {/* Bordered canvas frame */}
      <div
        style={{
          border: `1px solid ${Colors.wall}`,
          lineHeight: 0,
        }}
      >
        <canvas ref={canvasRef} style={{ touchAction: 'none', display: 'block' }} />
      </div>

      {/* Bottom slot — fixed height to keep maze position stable across states */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 110,
        }}
      >
        {/* Swipe pad */}
        {joystickEnabled && !tiltIsActive && mode === 'race' && !comparisonData && (
          <SwipePad onDirection={handlePadDirection} />
        )}

        {/* Tilt calibrate */}
        {tiltIsActive && (
          <button
            onClick={calibrateTilt}
            style={{
              background: 'none',
              border: `1px solid ${UIColors.primary}`,
              borderRadius: 0,
              color: UIColors.highlight,
              fontFamily: UI_FONT,
              fontSize: '0.6rem',
              fontWeight: 400,
              letterSpacing: '0.1em',
              padding: '0.8rem 1.5rem',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              textTransform: 'uppercase',
            }}
          >
            calibrate
          </button>
        )}

        {/* Comparison stats */}
        {comparisonData && (
          <div
            style={{
              border: `1px solid ${UIColors.primary}`,
              padding: '1rem 1.2rem',
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              fontFamily: UI_FONT,
              fontSize: '0.6rem',
              fontWeight: 400,
              color: UIColors.primary,
              letterSpacing: '0.05em',
              lineHeight: 1.8,
            }}
          >
            <span>
              Your path:{' '}
              <span style={{ color: Colors.classicalPath }}>
                {comparisonData.playerPathLength}
              </span>
            </span>
            <span>
              Optimal:{' '}
              <span style={{ color: Colors.optimalPath }}>
                {comparisonData.optimalLength}
              </span>
            </span>
            <span>
              Moves:{' '}
              <span>{comparisonData.playerMoves}</span>
            </span>
            <span>
              Dead ends:{' '}
              <span>{comparisonData.deadEnds}</span>
            </span>
            <span>
              Human:{' '}
              <span>{(comparisonData.playerTime / 1000).toFixed(1)}s</span>
            </span>
            <span>
              Quantum:{' '}
              <span>{(comparisonData.quantumTime / 1000).toFixed(1)}s</span>
            </span>
          </div>
        )}
      </div>

      {/* Back button — outside the fixed slot */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: UIColors.dim,
            fontFamily: UI_FONT,
            fontSize: '0.65rem',
            fontWeight: 400,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            textTransform: 'uppercase',
          }}
        >
          back
        </button>
      )}
    </div>
  );
}
