import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const SIZE = 1024;
const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

// App colors
const BG = '#050A14';
const WALL = '#1E7A9E';
const CLASSICAL = '#FFD700';
const QUANTUM = '#00E5CC';
const EXIT = '#00FF88';

// Fill background
ctx.fillStyle = BG;
ctx.fillRect(0, 0, SIZE, SIZE);

// Rounded rect clip for iOS-style shape preview
// (actual masking done by iOS, but helps visualize)

// Subtle star field
const rng = (seed) => {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
};
const rand = rng(77);
for (let i = 0; i < 80; i++) {
  const x = rand() * SIZE;
  const y = rand() * SIZE;
  const r = rand() * 1.5 + 0.3;
  const alpha = rand() * 0.15 + 0.05;
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// --- Draw a 7x7 maze (visible portion: inner 5x5 with borders) ---
const MARGIN = 140;
const MAZE_SIZE = SIZE - MARGIN * 2;
const CELLS = 7;
const CELL = MAZE_SIZE / CELLS;

// Manually designed maze for icon clarity
// Horizontal walls: 8 rows x 7 cols (top/bottom borders + inner)
// 1 = wall segment present
// Maze walls designed so the classical path has no wall crossings.
// Moving south from (c,r) to (c,r+1): blocked if hWalls[r+1][c] = 1
// Moving east  from (c,r) to (c+1,r): blocked if vWalls[r][c+1] = 1
const hWalls = [
  [0, 0, 0, 0, 0, 0, 0], // top border removed
  [0, 1, 0, 1, 0, 0, 1], // row 1
  [0, 0, 1, 0, 0, 1, 0], // row 2
  [1, 0, 0, 0, 1, 0, 1], // row 3
  [0, 1, 0, 0, 1, 0, 0], // row 4
  [1, 0, 1, 1, 0, 1, 0], // row 5
  [0, 1, 0, 0, 1, 0, 1], // row 6
  [0, 0, 0, 0, 0, 0, 0], // bottom border removed
];

// Vertical walls: 7 rows x 8 cols (left/right borders + inner)
const vWalls = [
  [0, 0, 1, 0, 1, 0, 1, 0], // row 0
  [0, 1, 0, 0, 0, 1, 0, 0], // row 1
  [0, 0, 0, 1, 0, 1, 0, 0], // row 2
  [0, 0, 1, 0, 0, 0, 1, 0], // row 3
  [0, 1, 0, 0, 0, 0, 0, 0], // row 4
  [0, 0, 1, 0, 0, 1, 0, 0], // row 5
  [0, 0, 0, 1, 0, 0, 1, 0], // row 6
];

function drawWallSegments(style, width) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Horizontal walls
  for (let row = 0; row <= CELLS; row++) {
    for (let col = 0; col < CELLS; col++) {
      if (hWalls[row]?.[col]) {
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
      if (vWalls[row]?.[col]) {
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

// Wall glow layer
drawWallSegments('rgba(30, 122, 158, 0.25)', 16);
// Main wall layer
drawWallSegments(WALL, 5);

// --- Classical path (gold) - a winding path from top-left toward center ---
// Path as cell coordinates [col, row]
// Path verified against wall arrays — every step passes through an open passage
const classicalPath = [
  [0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [2, 4], [3, 4]
];

function cellCenter(col, row) {
  return [MARGIN + col * CELL + CELL / 2, MARGIN + row * CELL + CELL / 2];
}

// Draw classical path with glow
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Glow
ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
ctx.lineWidth = 18;
ctx.beginPath();
for (let i = 0; i < classicalPath.length; i++) {
  const [cx, cy] = cellCenter(classicalPath[i][0], classicalPath[i][1]);
  if (i === 0) ctx.moveTo(cx, cy);
  else ctx.lineTo(cx, cy);
}
ctx.stroke();

// Solid path
ctx.strokeStyle = CLASSICAL;
ctx.lineWidth = 5;
ctx.globalAlpha = 0.85;
ctx.beginPath();
for (let i = 0; i < classicalPath.length; i++) {
  const [cx, cy] = cellCenter(classicalPath[i][0], classicalPath[i][1]);
  if (i === 0) ctx.moveTo(cx, cy);
  else ctx.lineTo(cx, cy);
}
ctx.stroke();
ctx.globalAlpha = 1;

// Classical cursor (red dot at end of path)
const [curX, curY] = cellCenter(classicalPath[classicalPath.length - 1][0], classicalPath[classicalPath.length - 1][1]);
ctx.fillStyle = '#FF2D2D';
ctx.shadowColor = '#FF2D2D';
ctx.shadowBlur = 12;
ctx.beginPath();
ctx.arc(curX, curY, 10, 0, Math.PI * 2);
ctx.fill();
ctx.shadowBlur = 0;

// --- Quantum wave (cyan) - expanding from exit toward center ---
// Show quantum cells as filled translucent squares on the right side
const quantumCells = [
  [6, 6], [5, 6], [6, 5], [5, 5], [4, 6], [6, 4], [4, 5], [5, 4],
  [4, 4], [3, 5], [3, 6], [5, 3], [6, 3], [4, 3],
];

// Sort by distance from exit for amplitude effect
const amplitudes = quantumCells.map(([c, r]) => {
  const dist = Math.abs(c - 6) + Math.abs(r - 6);
  return Math.max(0.08, 0.45 - dist * 0.06);
});

for (let i = 0; i < quantumCells.length; i++) {
  const [col, row] = quantumCells[i];
  const alpha = amplitudes[i];
  const x = MARGIN + col * CELL + 4;
  const y = MARGIN + row * CELL + 4;
  const s = CELL - 8;

  // Cell fill
  ctx.fillStyle = `rgba(30, 122, 158, ${alpha})`;
  ctx.fillRect(x, y, s, s);

  // Cell border
  ctx.strokeStyle = `rgba(30, 122, 158, ${alpha + 0.15})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, s, s);
}

// Exit marker (bright green square at bottom-right)
const exitCellX = MARGIN + 6 * CELL;
const exitCellY = MARGIN + 6 * CELL;
ctx.fillStyle = 'rgba(0, 255, 136, 0.9)';
ctx.fillRect(exitCellX + 4, exitCellY + 4, CELL - 8, CELL - 8);

// Start marker (solid blue dot at top-left, no glow)
const [startX, startY] = cellCenter(0, 0);
ctx.fillStyle = '#4D9FFF';
ctx.beginPath();
ctx.arc(startX, startY, 10, 0, Math.PI * 2);
ctx.fill();

// Vignette
const gradient = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.3, SIZE / 2, SIZE / 2, SIZE * 0.72);
gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
gradient.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, SIZE, SIZE);

// Write output to project root for preview
const buf = canvas.toBuffer('image/png');
writeFileSync('app-icon-new.png', buf);
console.log(`Written app-icon-new.png (${buf.length} bytes)`);
