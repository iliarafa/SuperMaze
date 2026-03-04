import { useRef, useEffect } from 'react';
import { MazeData, cellIndex, Direction } from '../game/maze';
import { Colors } from '../game/colors';

interface MazeRendererProps {
  maze: MazeData;
}

export function MazeRenderer({ maze }: MazeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const containerSize = Math.min(window.innerWidth, window.innerHeight) - 32;
    const cellSize = Math.floor(containerSize / maze.width);
    const mazePixelSize = cellSize * maze.width;

    canvas.style.width = `${mazePixelSize}px`;
    canvas.style.height = `${mazePixelSize}px`;
    canvas.width = mazePixelSize * dpr;
    canvas.height = mazePixelSize * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = Colors.background;
    ctx.fillRect(0, 0, mazePixelSize, mazePixelSize);

    // Draw start and exit nodes
    const nodeInset = Math.floor(cellSize * 0.2);
    const nodeSize = cellSize - nodeInset * 2;

    ctx.fillStyle = Colors.startNode;
    const [sx, sy] = maze.start;
    ctx.fillRect(sx * cellSize + nodeInset, sy * cellSize + nodeInset, nodeSize, nodeSize);

    ctx.fillStyle = Colors.exitNode;
    const [ex, ey] = maze.exit;
    ctx.fillRect(ex * cellSize + nodeInset, ey * cellSize + nodeInset, nodeSize, nodeSize);

    // Draw walls
    ctx.strokeStyle = Colors.wall;
    ctx.lineWidth = 2;
    ctx.lineCap = 'square';

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = maze.cells[cellIndex(maze.width, x, y)];
        const px = x * cellSize;
        const py = y * cellSize;

        // Draw north wall if closed
        if (!(cell & Direction.N)) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
          ctx.stroke();
        }

        // Draw west wall if closed
        if (!(cell & Direction.W)) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cellSize);
          ctx.stroke();
        }

        // Draw south wall on bottom edge
        if (y === maze.height - 1 && !(cell & Direction.S)) {
          ctx.beginPath();
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }

        // Draw east wall on right edge
        if (x === maze.width - 1 && !(cell & Direction.E)) {
          ctx.beginPath();
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }
      }
    }

    // Draw outer border (bottom and right edges fully)
    ctx.beginPath();
    ctx.moveTo(0, mazePixelSize);
    ctx.lineTo(mazePixelSize, mazePixelSize);
    ctx.lineTo(mazePixelSize, 0);
    ctx.stroke();
  }, [maze]);

  return <canvas ref={canvasRef} />;
}
