import { Colors, UIColors, UI_FONT } from '../game/colors';

interface HowToPlayProps {
  onBack: () => void;
}

export function HowToPlay({ onBack }: HowToPlayProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: UIColors.bg,
        padding: '2rem 1.5rem',
        paddingTop: 'calc(2rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <button
        onClick={onBack}
        style={{
          alignSelf: 'flex-start',
          background: 'none',
          border: 'none',
          color: UIColors.primary,
          fontFamily: UI_FONT,
          fontSize: '0.75rem',
          fontWeight: 400,
          letterSpacing: '0.05em',
          cursor: 'pointer',
          marginBottom: '2rem',
          padding: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {'< BACK'}
      </button>

      <h2
        style={{
          fontFamily: UI_FONT,
          fontSize: '1.1rem',
          fontWeight: 400,
          letterSpacing: '0.15em',
          color: UIColors.highlight,
          textTransform: 'uppercase',
          marginBottom: '2rem',
          textAlign: 'center',
        }}
      >
        How to Play
      </h2>

      <Section title="Classical vs Quantum Search">
        A classical search checks paths one by one — in the worst case it must
        try all N possibilities to find the answer. Quantum search (Grover's
        algorithm) exploits superposition and interference to amplify the
        correct path, finding it in roughly √N steps instead of N. As mazes
        grow larger, this gap becomes dramatic: what takes a classical agent
        1,000,000 checks takes a quantum agent only 1,000.
      </Section>

      <Section title="How It Works">
        You are the classical agent (orange). Navigate the maze to the exit in
        the bottom-right corner. Once you arrive, a quantum wave (blue-green)
        expands through the maze and reveals the optimal path. Your path is
        compared against it — matching the optimal path means "human is
        quantum." Beat the quantum agent's time too, and you reach "quantum is
        human."
      </Section>

      <Divider />

      <Section title="Visual Guide">
        <ColorRow color={Colors.classicalPath} label="Your path (active)" />
        <ColorRow color={Colors.classicalBacktrack} label="Backtracked path" />
        <ColorRow color={Colors.classicalCursor} label="Your position" />
        <ColorRow color={Colors.quantumWave} label="Quantum wave" />
        <ColorRow color={Colors.optimalPath} label="Optimal path" />
        <ColorRow color={Colors.overlapPath} label="Overlap (you matched optimal)" />
        <ColorRow color={Colors.exitNode} label="Exit node" />
        <ColorRow color={Colors.startNode} label="Start node" />
      </Section>

      <Divider />

      <Section title="Controls">
        <Row icon=">" text="Swipe — use the on-screen swipe pad to move one cell in any direction" />
        <Row icon=">" text="Tap — tap an adjacent cell to move there directly" />
        <Row icon=">" text="Tilt — tilt your device to move through the maze (enable in Settings)" />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '1.5rem', maxWidth: '360px', alignSelf: 'center', width: '100%' }}>
      <h3
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.85rem',
          fontWeight: 400,
          letterSpacing: '0.08em',
          color: UIColors.highlight,
          marginBottom: '0.75rem',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h3>
      <div
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.8rem',
          fontWeight: 400,
          color: UIColors.primary,
          lineHeight: 1.8,
        }}
      >
        {children}
      </div>
    </div>
  );
}


function Row({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        marginBottom: '0.4rem',
      }}
    >
      <span style={{ fontSize: '1rem', width: '1.5rem', textAlign: 'center', color: UIColors.primary }}>
        {icon}
      </span>
      <span style={{ color: UIColors.primary }}>{text}</span>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: '40px',
        height: '1px',
        backgroundColor: UIColors.dim,
        alignSelf: 'center',
        margin: '0.5rem 0 1.5rem',
      }}
    />
  );
}

function ColorRow({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        marginBottom: '0.4rem',
      }}
    >
      <div
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '3px',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span style={{ color: UIColors.primary, fontFamily: UI_FONT, fontSize: '0.75rem' }}>{label}</span>
    </div>
  );
}
