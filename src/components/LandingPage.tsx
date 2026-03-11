import { useCallback, useEffect, useRef } from 'react';
import { UIColors, UI_FONT, Colors } from '../game/colors';
import { Direction, Opposite, DirectionDelta } from '../game/maze';

const PIXEL = 4;
const CELL = 8;
const STAR_COUNT = 120;
const NEBULA_COUNT = 5;
const CONVERGE_SPEED = 0.0008;
const PROTO_MAZE_STEP_INTERVAL = 3;
const PROTO_WALL_ALPHA = 0.06;
const SHOOT_DURATION = 1.5;
const FIRST_SHOOT_DELAY = 3;
const SHOOT_INTERVAL = 7;
const FLASH_FRAMES = 15;
const MAX_MAZES = 10;

interface Star {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  brightness: number;
  phase: number;
  speed: number;
  color: [number, number, number];
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: [number, number, number];
  alpha: number;
  phase: number;
  drift: number;
}

interface ProtoMaze {
  cols: number;
  rows: number;
  cells: Uint8Array;
  visited: Uint8Array;
  stack: [number, number][];
  done: boolean;
  frameCount: number;
}

interface ShootingStar {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startTime: number;
  active: boolean;
}

interface Flash {
  x: number;
  y: number;
  timer: number;
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

function initProtoMaze(w: number, h: number): ProtoMaze {
  const cols = Math.floor(w / CELL);
  const rows = Math.floor(h / CELL);
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const cells = new Uint8Array(cols * rows);
  const visited = new Uint8Array(cols * rows);
  visited[cy * cols + cx] = 1;
  return { cols, rows, cells, visited, stack: [[cx, cy]], done: false, frameCount: 0 };
}

function stepProtoMaze(st: ProtoMaze): void {
  if (st.done || st.stack.length === 0) {
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

function randomEdgePoint(w: number, h: number): [number, number] {
  const perim = 2 * (w + h);
  const p = Math.random() * perim;
  if (p < w) return [p, 0];
  if (p < w + h) return [w, p - w];
  if (p < 2 * w + h) return [2 * w + h - p, h];
  return [0, perim - p];
}

function createStars(w: number, h: number): Star[] {
  const cols = Math.floor(w / PIXEL);
  const rows = Math.floor(h / PIXEL);
  const stars: Star[] = [];
  const palette: [number, number, number][] = [
    [180, 210, 240],
    [140, 180, 220],
    [200, 180, 255],
    [255, 220, 180],
    [100, 200, 200],
  ];
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = Math.floor(Math.random() * cols) * PIXEL;
    const y = Math.floor(Math.random() * rows) * PIXEL;
    stars.push({
      x,
      y,
      targetX: Math.round(x / CELL) * CELL,
      targetY: Math.round(y / CELL) * CELL,
      brightness: 0.2 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      color: palette[Math.floor(Math.random() * palette.length)],
    });
  }
  return stars;
}

function createNebulae(w: number, h: number): Nebula[] {
  const nebulae: Nebula[] = [];
  const colors: [number, number, number][] = [
    [30, 20, 80],
    [15, 40, 70],
    [40, 15, 50],
    [10, 50, 60],
    [25, 10, 60],
  ];
  for (let i = 0; i < NEBULA_COUNT; i++) {
    nebulae.push({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: 60 + Math.random() * 120,
      color: colors[i % colors.length],
      alpha: 0.03 + Math.random() * 0.04,
      phase: Math.random() * Math.PI * 2,
      drift: 0.1 + Math.random() * 0.2,
    });
  }
  return nebulae;
}

function computeLetterTargets(el1: HTMLElement, el2: HTMLElement): { x: number; y: number }[] {
  const targets: { x: number; y: number }[] = [];

  // "LOV'S"
  const r1 = el1.getBoundingClientRect();
  const text1 = "LOV'S";
  const charW1 = r1.width / text1.length;
  const cy1 = r1.top + r1.height / 2;
  for (let i = 0; i < text1.length; i++) {
    targets.push({ x: r1.left + (i + 0.5) * charW1, y: cy1 });
  }

  // "MAZE"
  const r2 = el2.getBoundingClientRect();
  const text2 = 'MAZE';
  const charW2 = r2.width / text2.length;
  const cy2 = r2.top + r2.height / 2;
  for (let i = 0; i < text2.length; i++) {
    targets.push({ x: r2.left + (i + 0.5) * charW2, y: cy2 });
  }

  return targets;
}

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const title1Ref = useRef<HTMLParagraphElement>(null);
  const title2Ref = useRef<HTMLParagraphElement>(null);
  const starsRef = useRef<Star[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const mazesRef = useRef<ProtoMaze[]>([]);
  const shootRef = useRef<ShootingStar | null>(null);
  const flashRef = useRef<Flash | null>(null);
  const letterTargetsRef = useRef<{ x: number; y: number }[]>([]);
  const nextShootTimeRef = useRef<number>(FIRST_SHOOT_DELAY);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const handleTouch = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      onStart();
    },
    [onStart]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateLetterTargets = () => {
      if (title1Ref.current && title2Ref.current) {
        letterTargetsRef.current = computeLetterTargets(title1Ref.current, title2Ref.current);
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      starsRef.current = createStars(canvas.width, canvas.height);
      nebulaeRef.current = createNebulae(canvas.width, canvas.height);
      mazesRef.current = [];
      shootRef.current = null;
      flashRef.current = null;
      // Defer letter target measurement to after layout
      requestAnimationFrame(updateLetterTargets);
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d')!;
    startTimeRef.current = 0;

    const draw = (time: number) => {
      if (startTimeRef.current === 0) startTimeRef.current = time;
      const elapsed = (time - startTimeRef.current) / 1000;
      const t = time / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = Colors.background;
      ctx.fillRect(0, 0, w, h);

      // nebula clouds
      for (const neb of nebulaeRef.current) {
        const nx = neb.x + Math.sin(t * neb.drift + neb.phase) * 8;
        const ny = neb.y + Math.cos(t * neb.drift * 0.7 + neb.phase) * 6;
        const [r, g, b] = neb.color;
        const breathe = 1 + Math.sin(t * 0.3 + neb.phase) * 0.15;
        const rad = neb.radius * breathe;

        const startCol = Math.max(0, Math.floor((nx - rad) / PIXEL));
        const endCol = Math.min(Math.floor(w / PIXEL), Math.ceil((nx + rad) / PIXEL));
        const startRow = Math.max(0, Math.floor((ny - rad) / PIXEL));
        const endRow = Math.min(Math.floor(h / PIXEL), Math.ceil((ny + rad) / PIXEL));

        for (let row = startRow; row < endRow; row++) {
          for (let col = startCol; col < endCol; col++) {
            const px = col * PIXEL + PIXEL / 2;
            const py = row * PIXEL + PIXEL / 2;
            const dist = Math.sqrt((px - nx) ** 2 + (py - ny) ** 2);
            if (dist < rad) {
              const falloff = 1 - dist / rad;
              const a = neb.alpha * falloff * falloff;
              ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
              ctx.fillRect(col * PIXEL, row * PIXEL, PIXEL, PIXEL);
            }
          }
        }
      }

      // all proto-mazes — step and draw simultaneously
      for (const pm of mazesRef.current) {
        pm.frameCount++;
        if (pm.frameCount % PROTO_MAZE_STEP_INTERVAL === 0 && !pm.done) {
          stepProtoMaze(pm);
        }

        const ox = Math.floor((w - pm.cols * CELL) / 2);
        const oy = Math.floor((h - pm.rows * CELL) / 2);

        ctx.strokeStyle = `rgba(30, 122, 158, ${PROTO_WALL_ALPHA})`;
        ctx.lineWidth = 1;
        for (let y = 0; y < pm.rows; y++) {
          for (let x = 0; x < pm.cols; x++) {
            if (!pm.visited[y * pm.cols + x]) continue;
            const cell = pm.cells[y * pm.cols + x];
            const px = ox + x * CELL;
            const py = oy + y * CELL;

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
        if (!pm.done && pm.stack.length > 0) {
          const [hx, hy] = pm.stack[pm.stack.length - 1];
          ctx.fillStyle = `rgba(30, 122, 158, ${PROTO_WALL_ALPHA * 4})`;
          ctx.fillRect(ox + hx * CELL, oy + hy * CELL, CELL, CELL);
        }
      }

      // stars — converge toward grid
      for (const star of starsRef.current) {
        star.x += (star.targetX - star.x) * CONVERGE_SPEED;
        star.y += (star.targetY - star.y) * CONVERGE_SPEED;

        const twinkle = 0.3 + 0.7 * ((Math.sin(t * star.speed + star.phase) + 1) / 2);
        const alpha = star.brightness * twinkle;
        const [r, g, b] = star.color;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(Math.round(star.x), Math.round(star.y), PIXEL, PIXEL);

        if (star.brightness > 0.6 && twinkle > 0.7) {
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.15})`;
          ctx.fillRect(Math.round(star.x) - PIXEL, Math.round(star.y), PIXEL, PIXEL);
          ctx.fillRect(Math.round(star.x) + PIXEL, Math.round(star.y), PIXEL, PIXEL);
          ctx.fillRect(Math.round(star.x), Math.round(star.y) - PIXEL, PIXEL, PIXEL);
          ctx.fillRect(Math.round(star.x), Math.round(star.y) + PIXEL, PIXEL, PIXEL);
        }
      }

      // shooting star — launch when it's time
      if (!shootRef.current && elapsed >= nextShootTimeRef.current) {
        const targets = letterTargetsRef.current;
        const [sx, sy] = randomEdgePoint(w, h);
        // pick a random letter target, fallback to center
        const target = targets.length > 0
          ? targets[Math.floor(Math.random() * targets.length)]
          : { x: w / 2, y: h / 2 };
        shootRef.current = {
          startX: sx,
          startY: sy,
          targetX: target.x,
          targetY: target.y,
          startTime: elapsed,
          active: true,
        };
      }

      // draw shooting star
      const shoot = shootRef.current;
      if (shoot && shoot.active) {
        const progress = Math.min(1, (elapsed - shoot.startTime) / SHOOT_DURATION);
        const sx = shoot.startX + (shoot.targetX - shoot.startX) * progress;
        const sy = shoot.startY + (shoot.targetY - shoot.startY) * progress;

        const dx = shoot.targetX - shoot.startX;
        const dy = shoot.targetY - shoot.startY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len;
        const uy = dy / len;

        const trail = 8;
        for (let i = 0; i < trail; i++) {
          const ta = (1 - i / trail) * 0.7 * (0.5 + 0.5 * progress);
          const tx = sx - ux * i * PIXEL * 1.5;
          const ty = sy - uy * i * PIXEL * 1.5;
          ctx.fillStyle = `rgba(200,220,255,${ta})`;
          ctx.fillRect(
            Math.floor(tx / PIXEL) * PIXEL,
            Math.floor(ty / PIXEL) * PIXEL,
            PIXEL,
            PIXEL
          );
        }

        ctx.fillStyle = `rgba(255,255,255,${0.8 * (0.5 + 0.5 * progress)})`;
        ctx.fillRect(
          Math.floor(sx / PIXEL) * PIXEL,
          Math.floor(sy / PIXEL) * PIXEL,
          PIXEL,
          PIXEL
        );

        // impact
        if (progress >= 1) {
          shoot.active = false;
          shootRef.current = null;
          nextShootTimeRef.current = elapsed + SHOOT_INTERVAL;

          flashRef.current = { x: shoot.targetX, y: shoot.targetY, timer: FLASH_FRAMES };

          // add a new maze (don't replace — accumulate)
          mazesRef.current.push(initProtoMaze(w, h));
          if (mazesRef.current.length > MAX_MAZES) {
            mazesRef.current.shift();
          }
        }
      }

      // impact flash
      const flash = flashRef.current;
      if (flash && flash.timer > 0) {
        const intensity = flash.timer / FLASH_FRAMES;
        const burstRadius = (1 - intensity) * 24 + 8;

        const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
        for (const angle of angles) {
          const rayLen = Math.floor(burstRadius / PIXEL);
          for (let i = 0; i < rayLen; i++) {
            const rx = flash.x + Math.cos(angle) * i * PIXEL;
            const ry = flash.y + Math.sin(angle) * i * PIXEL;
            const fa = intensity * (1 - i / rayLen) * 0.6;
            ctx.fillStyle = `rgba(180, 220, 255, ${fa})`;
            ctx.fillRect(
              Math.floor(rx / PIXEL) * PIXEL,
              Math.floor(ry / PIXEL) * PIXEL,
              PIXEL,
              PIXEL
            );
          }
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.8})`;
        ctx.fillRect(
          Math.floor(flash.x / PIXEL) * PIXEL - PIXEL,
          Math.floor(flash.y / PIXEL) * PIXEL - PIXEL,
          PIXEL * 3,
          PIXEL * 3
        );

        flash.timer--;
        if (flash.timer <= 0) flashRef.current = null;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

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
        height: '100vh',
        overflow: 'hidden',
      }}
      onTouchEnd={handleTouch}
      onClick={handleTouch}
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
          width: '100%',
          height: '100%',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <p
          ref={title1Ref}
          style={{
            fontFamily: UI_FONT,
            fontSize: '2.8rem',
            color: UIColors.primary,
            margin: 0,
            lineHeight: 1.4,
            textAlign: 'center',
          }}
        >
          LOVS
        </p>

        <p
          ref={title2Ref}
          style={{
            fontFamily: UI_FONT,
            fontSize: '2.8rem',
            color: UIColors.highlight,
            margin: 0,
            lineHeight: 1.4,
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          MAZE
        </p>

        <p
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.75rem',
            color: UIColors.dim,
            margin: 0,
            marginBottom: '4rem',
            textAlign: 'center',
          }}
        >
          a history of search
        </p>

        <p
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.85rem',
            color: UIColors.primary,
            margin: 0,
            textAlign: 'center',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          TAP TO START
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
