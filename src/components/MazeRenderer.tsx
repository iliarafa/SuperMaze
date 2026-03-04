import { useRef, useEffect, useCallback } from 'react';
import { MazeData, cellIndex, Direction } from '../game/maze';
import { Colors } from '../game/colors';

interface MazeRendererProps {
  maze: MazeData;
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
  // Background
  ctx.fillStyle = Colors.background;
  ctx.fillRect(0, 0, mazePixelSize, mazePixelSize);

  // Start and exit nodes
  const nodeInset = Math.floor(cellSize * 0.2);
  const nodeSize = cellSize - nodeInset * 2;

  ctx.fillStyle = Colors.startNode;
  const [sx, sy] = maze.start;
  ctx.fillRect(sx * cellSize + nodeInset, sy * cellSize + nodeInset, nodeSize, nodeSize);

  ctx.fillStyle = Colors.exitNode;
  const [ex, ey] = maze.exit;
  ctx.fillRect(ex * cellSize + nodeInset, ey * cellSize + nodeInset, nodeSize, nodeSize);

  // Walls
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

  // Outer border
  ctx.beginPath();
  ctx.moveTo(0, mazePixelSize);
  ctx.lineTo(mazePixelSize, mazePixelSize);
  ctx.lineTo(mazePixelSize, 0);
  ctx.stroke();
}

export function MazeRenderer({ maze }: MazeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const layoutRef = useRef<ReturnType<typeof computeLayout> | null>(null);

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

  // Set up main canvas and rAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function frame() {
      const layout = layoutRef.current;
      const offscreen = offscreenRef.current;
      if (!layout || !offscreen || !ctx || !canvas) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const { dpr, mazePixelSize } = layout;

      // Size main canvas
      canvas.style.width = `${mazePixelSize}px`;
      canvas.style.height = `${mazePixelSize}px`;
      canvas.width = mazePixelSize * dpr;
      canvas.height = mazePixelSize * dpr;
      ctx.scale(dpr, dpr);

      // Draw cached maze
      ctx.drawImage(offscreen, 0, 0, mazePixelSize, mazePixelSize);

      // Agent overlay will be drawn here in Task 5

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} />;
}
