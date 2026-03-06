import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const SIZE = 1024;
const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

// App colors
const BG = '#050A14';
const WALL = '#1E7A9E';
const WALL_GLOW = 'rgba(30, 122, 158, 0.3)';
const EXIT = '#00FF88';
const START = '#4D9FFF';

// Fill background
ctx.fillStyle = BG;
ctx.fillRect(0, 0, SIZE, SIZE);

// Subtle noise/stars
const rng = (seed) => {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
};
const rand = rng(42);
ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
for (let i = 0; i < 60; i++) {
  const x = rand() * SIZE;
  const y = rand() * SIZE;
  const r = rand() * 1.2 + 0.3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Draw a simplified maze pattern (5x5 grid with select walls removed)
const MARGIN = 100;
const MAZE_SIZE = SIZE - MARGIN * 2;
const CELLS = 5;
const CELL = MAZE_SIZE / CELLS;

// Maze walls: 1 = wall exists. [horizontal walls (6 rows x 5 cols), vertical walls (5 rows x 6 cols)]
// Design a simple but recognizable maze path from top-left to bottom-right
const hWalls = [
  [0, 0, 0, 0, 0], // top border removed
  [0, 1, 0, 0, 1],
  [1, 0, 1, 1, 0],
  [0, 1, 0, 0, 1],
  [1, 0, 1, 0, 0],
  [0, 0, 0, 0, 0], // bottom border removed
];

const vWalls = [
  [0, 0, 1, 0, 1, 0], // row 0 - left/right border removed
  [0, 1, 0, 1, 0, 0],
  [0, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 1, 0],
  [0, 0, 1, 0, 0, 0], // row 4 - left/right border removed
];

function drawWallSet(strokeStyle, lineWidth) {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'square';

  // Horizontal walls
  for (let row = 0; row <= CELLS; row++) {
    for (let col = 0; col < CELLS; col++) {
      if (hWalls[row][col]) {
        const x1 = MARGIN + col * CELL;
        const y1 = MARGIN + row * CELL;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + CELL, y1);
        ctx.stroke();
      }
    }
  }

  // Vertical walls
  for (let row = 0; row < CELLS; row++) {
    for (let col = 0; col <= CELLS; col++) {
      if (vWalls[row][col]) {
        const x1 = MARGIN + col * CELL;
        const y1 = MARGIN + row * CELL;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1, y1 + CELL);
        ctx.stroke();
      }
    }
  }
}

// Glow pass
drawWallSet(WALL_GLOW, 14);
// Crisp pass
drawWallSet(WALL, 5);

// Start node (top-left cell) - hollow square
const nodeInset = CELL * 0.25;
const nodeSize = CELL - nodeInset * 2;
ctx.strokeStyle = START;
ctx.lineWidth = 4;
ctx.strokeRect(MARGIN + nodeInset, MARGIN + nodeInset, nodeSize, nodeSize);

// Exit node (bottom-right cell) - filled with glow
const ex = MARGIN + (CELLS - 1) * CELL;
const ey = MARGIN + (CELLS - 1) * CELL;
const glowInset = CELL * 0.15;
const glowSize = CELL - glowInset * 2;
ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
ctx.fillRect(ex + glowInset, ey + glowInset, glowSize, glowSize);
ctx.fillStyle = EXIT;
ctx.fillRect(ex + nodeInset, ey + nodeInset, nodeSize, nodeSize);

// Subtle vignette
const gradient = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.25, SIZE / 2, SIZE / 2, SIZE * 0.7);
gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, SIZE, SIZE);

// Write output
const buf = canvas.toBuffer('image/png');
const outPath = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
writeFileSync(outPath, buf);
console.log(`Written ${outPath} (${buf.length} bytes)`);
