import { UI_FONT, UIColors } from '../game/colors';
import { useSettings } from '../game/settings';
import { requestTiltPermission } from '../game/tiltInput';

interface SettingsProps {
  onBack: () => void;
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        maxWidth: '320px',
        background: 'none',
        border: `1px solid ${UIColors.primary}`,
        borderRadius: 0,
        padding: '1.2rem 1.5rem',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.75rem',
          fontWeight: 400,
          color: UIColors.highlight,
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.65rem',
          fontWeight: 400,
          color: value ? '#00FF88' : UIColors.dim,
          letterSpacing: '0.05em',
        }}
      >
        {value ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

export function Settings({ onBack }: SettingsProps) {
  const [settings, update] = useSettings();

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
        Settings
      </h2>

      <ToggleRow
        label="SWIPE PAD"
        value={settings.joystickEnabled}
        onToggle={() => {
          const next = !settings.joystickEnabled;
          update('joystickEnabled', next);
          if (next && settings.tiltEnabled) update('tiltEnabled', false);
        }}
      />

      <ToggleRow
        label="TILT MAZE"
        value={settings.tiltEnabled}
        onToggle={async () => {
          if (!settings.tiltEnabled) {
            const result = await requestTiltPermission();
            if (result === 'granted') {
              update('tiltEnabled', true);
              if (settings.joystickEnabled) update('joystickEnabled', false);
            }
          } else {
            update('tiltEnabled', false);
          }
        }}
      />

      <ToggleRow
        label="SOUND"
        value={settings.soundEnabled}
        onToggle={() => update('soundEnabled', !settings.soundEnabled)}
      />

      <button
        onClick={onBack}
        style={{
          marginTop: '2rem',
          background: 'none',
          border: 'none',
          color: UIColors.dim,
          fontFamily: UI_FONT,
          fontSize: '0.65rem',
          fontWeight: 400,
          letterSpacing: '0.08em',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          textTransform: 'uppercase',
        }}
      >
        BACK
      </button>
    </div>
  );
}
