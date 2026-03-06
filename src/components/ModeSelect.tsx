import { useCallback } from 'react';
import { UI_FONT, UIColors } from '../game/colors';

export type GameMode = 'race' | 'observe';

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  onHowToPlay: () => void;
  onSettings: () => void;
  onBack: () => void;
}

export function ModeSelect({ onSelectMode, onHowToPlay, onSettings, onBack }: ModeSelectProps) {
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
        backgroundColor: UIColors.bg,
        padding: '2rem 1.5rem',
        paddingTop: 'calc(2rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
      }}
    >
      <h2
        style={{
          fontFamily: UI_FONT,
          fontSize: '1.1rem',
          fontWeight: 400,
          letterSpacing: '0.15em',
          color: UIColors.highlight,
          textTransform: 'uppercase',
          marginBottom: '2.5rem',
        }}
      >
        Select Mode
      </h2>

      <ModeCard
        title="Race"
        description="Find the shortest path. Then watch the quantum solution unfold."
        available
        onSelect={handleRace}
      />

      <ModeCard
        title="Observe & Collapse"
        description="Guide a quantum wave. Hold to charge, release to collapse."
        available
        onSelect={handleObserve}
      />

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '2rem',
        }}
      >
        <button
          onClick={onHowToPlay}
          style={{
            background: 'none',
            border: `1px solid ${UIColors.primary}`,
            borderRadius: 0,
            padding: '0.7rem 1.5rem',
            color: UIColors.primary,
            fontFamily: UI_FONT,
            fontSize: '0.75rem',
            fontWeight: 400,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          HOW TO PLAY
        </button>

        <button
          onClick={onSettings}
          style={{
            background: 'none',
            border: `1px solid ${UIColors.primary}`,
            borderRadius: 0,
            padding: '0.7rem 1.5rem',
            color: UIColors.primary,
            fontFamily: UI_FONT,
            fontSize: '0.75rem',
            fontWeight: 400,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          SETTINGS
        </button>
      </div>

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
  );
}

function ModeCard({
  title,
  description,
  available,
  onSelect,
}: {
  title: string;
  description: string;
  available: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={available ? onSelect : undefined}
      style={{
        width: '100%',
        maxWidth: '320px',
        background: 'none',
        border: `1px solid ${UIColors.primary}`,
        borderRadius: 0,
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
            fontFamily: UI_FONT,
            fontSize: '0.9rem',
            fontWeight: 400,
            color: UIColors.highlight,
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </h3>
      </div>
      <p
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.65rem',
          fontWeight: 400,
          color: UIColors.dim,
          lineHeight: 1.8,
        }}
      >
        {description}
      </p>
    </button>
  );
}
