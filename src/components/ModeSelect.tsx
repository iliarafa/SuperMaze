import { useCallback } from 'react';
import { UI_FONT, UIColors } from '../game/colors';

export type GameMode = 'race' | 'observe';

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  onHowToPlay: () => void;
  onGrover: () => void;
  onSettings: () => void;
  onBack: () => void;
}

export function ModeSelect({ onSelectMode, onHowToPlay, onGrover, onSettings, onBack }: ModeSelectProps) {
  const handleRace = useCallback(() => onSelectMode('race'), [onSelectMode]);

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
      <MenuButton label="ENTER MAZE" onSelect={handleRace} />
      <MenuButton label="HOW TO PLAY" onSelect={onHowToPlay} />
      <MenuButton label="GROVER'S ALGORITHM" onSelect={onGrover} />
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
