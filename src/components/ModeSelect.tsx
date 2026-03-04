import { useCallback } from 'react';
import { Colors } from '../game/colors';

export type GameMode = 'race' | 'observe';

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  onHowToPlay: () => void;
  onBack: () => void;
}

const font =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

export function ModeSelect({ onSelectMode, onHowToPlay, onBack }: ModeSelectProps) {
  const handleRace = useCallback(() => onSelectMode('race'), [onSelectMode]);
  const handleObserve = useCallback(() => onSelectMode('observe'), [onSelectMode]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: Colors.background,
        padding: '2rem 1.5rem',
        paddingTop: 'calc(2rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
      }}
    >
      <h2
        style={{
          fontFamily: font,
          fontSize: '1.4rem',
          fontWeight: 200,
          letterSpacing: '0.15em',
          color: Colors.accent,
          textTransform: 'uppercase',
          marginBottom: '2.5rem',
        }}
      >
        Select Mode
      </h2>

      <ModeCard
        title="Race"
        description="Control the classical agent. Beat the quantum wave to the exit."
        color={Colors.classicalPath}
        available
        onSelect={handleRace}
      />

      <ModeCard
        title="Observe & Collapse"
        description="Guide a quantum wave. Hold to charge, release to collapse."
        color={Colors.exitNode}
        available={false}
        onSelect={handleObserve}
      />

      <button
        onClick={onHowToPlay}
        style={{
          marginTop: '2rem',
          background: 'none',
          border: `1px solid ${Colors.wall}`,
          borderRadius: '8px',
          padding: '0.7rem 1.5rem',
          color: Colors.textPrimary,
          fontFamily: font,
          fontSize: '0.85rem',
          fontWeight: 300,
          letterSpacing: '0.08em',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        How to Play
      </button>

      <button
        onClick={onBack}
        style={{
          marginTop: '1rem',
          background: 'none',
          border: 'none',
          color: Colors.textPrimary,
          fontFamily: font,
          fontSize: '0.8rem',
          fontWeight: 300,
          opacity: 0.5,
          letterSpacing: '0.08em',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        back
      </button>
    </div>
  );
}

function ModeCard({
  title,
  description,
  color,
  available,
  onSelect,
}: {
  title: string;
  description: string;
  color: string;
  available: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={available ? onSelect : undefined}
      style={{
        width: '100%',
        maxWidth: '320px',
        background: available
          ? `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.08), rgba(${hexToRgb(color)}, 0.02))`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${available ? color : Colors.wall}`,
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1rem',
        textAlign: 'left',
        cursor: available ? 'pointer' : 'default',
        opacity: available ? 1 : 0.4,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem',
        }}
      >
        <h3
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
            fontSize: '1.1rem',
            fontWeight: 500,
            color: available ? color : Colors.textPrimary,
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </h3>
        {!available && (
          <span
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              fontSize: '0.65rem',
              fontWeight: 400,
              color: Colors.textPrimary,
              opacity: 0.5,
              letterSpacing: '0.05em',
              border: `1px solid ${Colors.wall}`,
              borderRadius: '4px',
              padding: '0.15rem 0.4rem',
            }}
          >
            coming soon
          </span>
        )}
      </div>
      <p
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          fontSize: '0.8rem',
          fontWeight: 300,
          color: Colors.textPrimary,
          opacity: 0.7,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </button>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
