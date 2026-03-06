import { useCallback } from 'react';
import { UIColors, UI_FONT } from '../game/colors';

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const handleTouch = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      onStart();
    },
    [onStart]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100vh',
        backgroundColor: UIColors.bg,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      onTouchEnd={handleTouch}
      onClick={handleTouch}
    >
      <p
        style={{
          fontFamily: UI_FONT,
          fontSize: '2.4rem',
          color: UIColors.primary,
          margin: 0,
          lineHeight: 1.4,
          textAlign: 'center',
        }}
      >
        SUPER
      </p>

      <p
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
        classical vs quantum search
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
