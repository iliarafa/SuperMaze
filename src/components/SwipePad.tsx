import { useRef, useState, useCallback } from 'react';
import { Direction } from '../game/maze';
import { UIColors } from '../game/colors';

interface SwipePadProps {
  onDirection: (dir: number) => void;
}

const PAD_SIZE = 110;
const SWIPE_THRESHOLD = 10;
const REPEAT_DELAY = 220;

/** Map Direction constant to rotation degrees for the pacman mouth */
function dirToDeg(dir: number): number {
  if (dir === Direction.E) return 0;
  if (dir === Direction.S) return 90;
  if (dir === Direction.W) return 180;
  if (dir === Direction.N) return 270;
  return 0;
}

export function SwipePad({ onDirection }: SwipePadProps) {
  const [facing, setFacing] = useState(0); // degrees
  const [mouthOpen, setMouthOpen] = useState(false);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const lastDir = useRef<number | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRepeat = useCallback(() => {
    if (repeatTimer.current !== null) {
      clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  }, []);

  const fireDirection = useCallback(
    (dir: number) => {
      onDirection(dir);
      setFacing(dirToDeg(dir));
      setMouthOpen(true);
      setTimeout(() => setMouthOpen(false), 120);
    },
    [onDirection],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      touchOrigin.current = { x: touch.clientX, y: touch.clientY };
      lastDir.current = null;
      clearRepeat();
    },
    [clearRepeat],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const origin = touchOrigin.current;
      if (!origin) return;

      const touch = e.touches[0];
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;

      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

      let dir: number;
      if (Math.abs(dx) >= Math.abs(dy)) {
        dir = dx > 0 ? Direction.E : Direction.W;
      } else {
        dir = dy > 0 ? Direction.S : Direction.N;
      }

      if (dir !== lastDir.current) {
        lastDir.current = dir;
        fireDirection(dir);
        // Reset origin so next swipe is relative to current position
        touchOrigin.current = { x: touch.clientX, y: touch.clientY };

        // Start repeat interval
        clearRepeat();
        repeatTimer.current = setInterval(() => {
          if (lastDir.current !== null) {
            fireDirection(lastDir.current);
          }
        }, REPEAT_DELAY);
      }
    },
    [fireDirection, clearRepeat],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      touchOrigin.current = null;
      lastDir.current = null;
      clearRepeat();
    },
    [clearRepeat],
  );

  // Pacman SVG
  const mouthAngle = mouthOpen ? 40 : 12;
  const radius = 16;
  const cx = 20;
  const cy = 20;
  const startAngle = (mouthAngle / 2) * (Math.PI / 180);
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(-startAngle);
  const y2 = cy + radius * Math.sin(-startAngle);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: PAD_SIZE,
        height: PAD_SIZE,
        borderRadius: '50%',
        border: `2px solid ${UIColors.dim}`,
        boxShadow: `0 0 12px rgba(30, 122, 158, 0.25), inset 0 0 20px rgba(0, 0, 0, 0.5)`,
        background: 'radial-gradient(circle, #1a1a1a 0%, #0a0a0a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        style={{
          transform: `rotate(${facing}deg)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        <path
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 1 0 ${x2} ${y2} Z`}
          fill="#FFD700"
        />
        {/* Eye */}
        <circle cx={cx + 4} cy={cy - 8} r={2.5} fill="#0a0a0a" />
      </svg>
    </div>
  );
}
