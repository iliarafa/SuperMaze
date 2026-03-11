import { useCallback, useEffect, useRef } from 'react';
import { UI_FONT, UIColors, Colors } from '../game/colors';
import { Direction, Opposite, DirectionDelta } from '../game/maze';

export type GameMode = 'race' | 'observe';

const CELL = 8;
const CARVE_PER_FRAME = 3;
const HOLD_AFTER_COMPLETE = 120; // frames (~2s at 60fps)
const FADE_FRAMES = 60;
const WALL_ALPHA = 0.25;
const HEAD_ALPHA = 0.6;
const VISITED_ALPHA = 0.04;

interface MazeAnimState {
  cols: number;
  rows: number;
  cells: Uint8Array;
  visited: Uint8Array;
  stack: [number, number][];
  done: boolean;
  holdCount: number;
  fadeCount: number;
  fading: boolean;
}

function initMaze(w: number, h: number): MazeAnimState {
  const cols = Math.floor(w / CELL);
  const rows = Math.floor(h / CELL);
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const cells = new Uint8Array(cols * rows);
  const visited = new Uint8Array(cols * rows);
  visited[cy * cols + cx] = 1;
  return {
    cols,
    rows,
    cells,
    visited,
    stack: [[cx, cy]],
    done: false,
    holdCount: 0,
    fadeCount: 0,
    fading: false,
  };
}

const DIRS = [Direction.N, Direction.S, Direction.E, Direction.W];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stepMaze(st: MazeAnimState): void {
  if (st.done) return;
  for (let s = 0; s < CARVE_PER_FRAME; s++) {
    if (st.stack.length === 0) {
      st.done = true;
      return;
    }
    const [x, y] = st.stack[st.stack.length - 1];
    const dirs = shuffled(DIRS);
    let carved = false;
    for (const dir of dirs) {
      const [dx, dy] = DirectionDelta[dir];
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < st.cols && ny >= 0 && ny < st.rows && !st.visited[ny * st.cols + nx]) {
        st.cells[y * st.cols + x] |= dir;
        st.cells[ny * st.cols + nx] |= Opposite[dir];
        st.visited[ny * st.cols + nx] = 1;
        st.stack.push([nx, ny]);
        carved = true;
        break;
      }
    }
    if (!carved) {
      st.stack.pop();
    }
  }
}

function drawMaze(ctx: CanvasRenderingContext2D, st: MazeAnimState, opacity: number): void {
  const w = st.cols * CELL;
  const h = st.rows * CELL;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // background
  ctx.fillStyle = Colors.background;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.globalAlpha = opacity;

  // offset to center the grid
  const ox = Math.floor((ctx.canvas.width - w) / 2);
  const oy = Math.floor((ctx.canvas.height - h) / 2);

  // visited cells - subtle fill
  for (let y = 0; y < st.rows; y++) {
    for (let x = 0; x < st.cols; x++) {
      if (st.visited[y * st.cols + x]) {
        ctx.fillStyle = `rgba(30, 122, 158, ${VISITED_ALPHA})`;
        ctx.fillRect(ox + x * CELL, oy + y * CELL, CELL, CELL);
      }
    }
  }

  // walls
  ctx.strokeStyle = `rgba(30, 122, 158, ${WALL_ALPHA})`;
  ctx.lineWidth = 1;
  for (let y = 0; y < st.rows; y++) {
    for (let x = 0; x < st.cols; x++) {
      if (!st.visited[y * st.cols + x]) continue;
      const cell = st.cells[y * st.cols + x];
      const px = ox + x * CELL;
      const py = oy + y * CELL;

      // draw walls where there is NO passage
      if (!(cell & Direction.N)) {
        ctx.beginPath();
        ctx.moveTo(px, py + 0.5);
        ctx.lineTo(px + CELL, py + 0.5);
        ctx.stroke();
      }
      if (!(cell & Direction.S)) {
        ctx.beginPath();
        ctx.moveTo(px, py + CELL - 0.5);
        ctx.lineTo(px + CELL, py + CELL - 0.5);
        ctx.stroke();
      }
      if (!(cell & Direction.W)) {
        ctx.beginPath();
        ctx.moveTo(px + 0.5, py);
        ctx.lineTo(px + 0.5, py + CELL);
        ctx.stroke();
      }
      if (!(cell & Direction.E)) {
        ctx.beginPath();
        ctx.moveTo(px + CELL - 0.5, py);
        ctx.lineTo(px + CELL - 0.5, py + CELL);
        ctx.stroke();
      }
    }
  }

  // carving head glow
  if (!st.done && st.stack.length > 0) {
    const [hx, hy] = st.stack[st.stack.length - 1];
    ctx.fillStyle = `rgba(30, 122, 158, ${HEAD_ALPHA})`;
    ctx.fillRect(ox + hx * CELL, oy + hy * CELL, CELL, CELL);

    // trail of last few stack entries
    const trailLen = Math.min(8, st.stack.length);
    for (let i = 1; i < trailLen; i++) {
      const [tx, ty] = st.stack[st.stack.length - 1 - i];
      const ta = HEAD_ALPHA * (1 - i / trailLen) * 0.5;
      ctx.fillStyle = `rgba(30, 122, 158, ${ta})`;
      ctx.fillRect(ox + tx * CELL, oy + ty * CELL, CELL, CELL);
    }
  }

  ctx.globalAlpha = 1;
}

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  onHowToPlay: () => void;
  onGrover: () => void;
  onSettings: () => void;
  onBack: () => void;
}

export function ModeSelect({ onSelectMode, onHowToPlay, onGrover, onSettings, onBack }: ModeSelectProps) {
  const handleRace = useCallback(() => onSelectMode('race'), [onSelectMode]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MazeAnimState | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stateRef.current = initMaze(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d')!;

    const loop = () => {
      const st = stateRef.current;
      if (!st) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      if (!st.done) {
        stepMaze(st);
        drawMaze(ctx, st, 1);
      } else if (!st.fading) {
        st.holdCount++;
        drawMaze(ctx, st, 1);
        if (st.holdCount >= HOLD_AFTER_COMPLETE) {
          st.fading = true;
        }
      } else {
        st.fadeCount++;
        const opacity = 1 - st.fadeCount / FADE_FRAMES;
        drawMaze(ctx, st, Math.max(0, opacity));
        if (st.fadeCount >= FADE_FRAMES) {
          stateRef.current = initMaze(canvas.width, canvas.height);
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem 1.5rem',
          paddingTop: 'calc(2rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
        }}
      >
        <MenuButton label="ENTER MAZE" onSelect={handleRace} />
        <MenuButton label="HOW TO PLAY" onSelect={onHowToPlay} />
        <MenuButton label="LOV'S ALGORITHM" onSelect={onGrover} />
        <MenuButton label="SETTINGS" onSelect={onSettings} />

        <button
          onClick={onBack}
          style={{
            marginTop: '1rem',
            background: 'none',
            border: 'none',
            color: UIColors.dim,
            fontFamily: UI_FONT,
            fontSize: '0.65rem',
            fontWeight: 400,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          BACK
        </button>
      </div>
    </div>
  );
}

function MenuButton({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        maxWidth: '320px',
        background: 'none',
        border: `1px solid ${UIColors.primary}`,
        borderRadius: 0,
        padding: '1.2rem 1.5rem',
        marginBottom: '1rem',
        textAlign: 'center',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        fontFamily: UI_FONT,
        fontSize: '0.85rem',
        fontWeight: 400,
        color: UIColors.highlight,
        letterSpacing: '0.1em',
      }}
    >
      {label}
    </button>
  );
}
