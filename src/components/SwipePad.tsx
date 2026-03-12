import { useRef, useState, useCallback, useEffect } from 'react';
import { Direction } from '../game/maze';
import { Colors } from '../game/colors';

interface SwipePadProps {
  onDirection: (dir: number) => void;
}

const PAD_SIZE = 100;
const KNOB_SIZE = 44;
const SWIPE_THRESHOLD = 10;
const REPEAT_DELAY = 220;
const KNOB_SHIFT = 16;

const PULSE_ID = 'swipepad-gem-pulse';

function dirToOffset(dir: number): { x: number; y: number } {
  if (dir === Direction.E) return { x: KNOB_SHIFT, y: 0 };
  if (dir === Direction.W) return { x: -KNOB_SHIFT, y: 0 };
  if (dir === Direction.S) return { x: 0, y: KNOB_SHIFT };
  if (dir === Direction.N) return { x: 0, y: -KNOB_SHIFT };
  return { x: 0, y: 0 };
}

/** Directional glow: shift box-shadow toward the active direction */
function dirToGlow(dir: number | null): string {
  const base = '0 0 8px rgba(0,0,0,0.6)';
  if (dir === Direction.E) return `${base}, 4px 0 14px rgba(0,229,204,0.5)`;
  if (dir === Direction.W) return `${base}, -4px 0 14px rgba(0,229,204,0.5)`;
  if (dir === Direction.S) return `${base}, 0 4px 14px rgba(0,229,204,0.5)`;
  if (dir === Direction.N) return `${base}, 0 -4px 14px rgba(0,229,204,0.5)`;
  return base;
}

const dotPositions: { dir: number; style: React.CSSProperties }[] = [
  { dir: Direction.N, style: { top: 0, left: '50%', transform: 'translateX(-50%)' } },
  { dir: Direction.S, style: { bottom: 0, left: '50%', transform: 'translateX(-50%)' } },
  { dir: Direction.E, style: { right: 0, top: '50%', transform: 'translateY(-50%)' } },
  { dir: Direction.W, style: { left: 0, top: '50%', transform: 'translateY(-50%)' } },
];

export function SwipePad({ onDirection }: SwipePadProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [activeDir, setActiveDir] = useState<number | null>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const lastDir = useRef<number | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inject pulse keyframes once
  useEffect(() => {
    if (document.getElementById(PULSE_ID)) return;
    const style = document.createElement('style');
    style.id = PULSE_ID;
    style.textContent = `
      @keyframes gemPulse {
        0%, 100% { box-shadow: 0 0 8px rgba(0,0,0,0.6), 0 0 12px rgba(30,122,158,0.3); }
        50% { box-shadow: 0 0 8px rgba(0,0,0,0.6), 0 0 18px rgba(30,122,158,0.5); }
      }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  const clearRepeat = useCallback(() => {
    if (repeatTimer.current !== null) {
      clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  }, []);

  const fireDirection = useCallback(
    (dir: number) => {
      onDirection(dir);
      setOffset(dirToOffset(dir));
      setActiveDir(dir);
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
      setActive(true);
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
        touchOrigin.current = { x: touch.clientX, y: touch.clientY };

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
      setActive(false);
      setActiveDir(null);
      setOffset({ x: 0, y: 0 });
      clearRepeat();
    },
    [clearRepeat],
  );

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: PAD_SIZE,
        height: PAD_SIZE,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Direction indicator squares */}
      {dotPositions.map(({ dir, style }) => (
        <div
          key={dir}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            background: activeDir === dir ? Colors.quantumWave : 'rgba(30, 122, 158, 0.2)',
            transition: 'background 0.15s ease',
            ...style,
          }}
        />
      ))}

      {/* Diamond knob */}
      <div
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: 8,
          transform: `rotate(45deg) translate(${offset.x * 0.707 + offset.y * 0.707}px, ${-offset.x * 0.707 + offset.y * 0.707}px)`,
          background: `linear-gradient(135deg, #6EC6E6 0%, #1E7A9E 40%, #0E4A5E 100%)`,
          border: `1px solid rgba(30, 122, 158, 0.5)`,
          boxShadow: active ? dirToGlow(activeDir) : undefined,
          transition: active
            ? 'transform 0.08s ease-out, box-shadow 0.1s ease'
            : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
          animation: !active ? 'gemPulse 3s ease-in-out infinite' : 'none',
        }}
      />
    </div>
  );
}
