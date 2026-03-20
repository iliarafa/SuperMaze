import { Colors, UIColors, UI_FONT, UI_BODY_FONT } from '../game/colors';

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
        <ColorRow color={Colors.classicalPath} label="Human path" />
        <ColorRow color={Colors.optimalPath} label="Optimal path" />
        <ColorRow color={Colors.startNode} label="Start node" />
        <ColorRow color={Colors.exitNode} label="Exit node" />
      </Section>

      <Divider />

      <Section title="Controls">
        <Row icon={<SwipeIcon />} text="Swipe — use the on-screen swipe pad to move one cell in any direction" />
        <Row icon={<TapIcon />} text="Tap — tap an adjacent cell to move there directly" />
        <Row icon={<TiltIcon />} text="Tilt — tilt your device to move through the maze (enable in Settings)" />
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
    <div style={{ marginBottom: '2rem', maxWidth: '360px', alignSelf: 'center', width: '100%' }}>
      <h3
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.75rem',
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
          fontFamily: UI_BODY_FONT,
          fontSize: '0.95rem',
          fontWeight: 400,
          color: UIColors.dim,
          lineHeight: 1.8,
          textAlign: 'justify',
        }}
      >
        {children}
      </div>
    </div>
  );
}


function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        marginBottom: '0.5rem',
      }}
    >
      <div style={{ width: '22px', height: '22px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <span style={{ color: UIColors.dim, fontFamily: UI_BODY_FONT, fontSize: '0.9rem' }}>{text}</span>
    </div>
  );
}

function SwipeIcon() {
  const c = UIColors.dim;
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" shapeRendering="crispEdges">
      <rect x="2" y="9" width="12" height="2" fill={c} />
      <rect x="12" y="5" width="2" height="10" fill={c} />
      <rect x="14" y="7" width="2" height="6" fill={c} />
      <rect x="16" y="9" width="2" height="2" fill={c} />
    </svg>
  );
}

function TapIcon() {
  const c = UIColors.dim;
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" shapeRendering="crispEdges">
      <rect x="7" y="2" width="6" height="2" fill={c} />
      <rect x="5" y="4" width="2" height="2" fill={c} />
      <rect x="13" y="4" width="2" height="2" fill={c} />
      <rect x="3" y="6" width="2" height="8" fill={c} />
      <rect x="15" y="6" width="2" height="8" fill={c} />
      <rect x="5" y="14" width="2" height="2" fill={c} />
      <rect x="13" y="14" width="2" height="2" fill={c} />
      <rect x="7" y="16" width="6" height="2" fill={c} />
      <rect x="8" y="8" width="4" height="4" fill={c} />
    </svg>
  );
}

function TiltIcon() {
  const c = UIColors.dim;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" shapeRendering="crispEdges">
      <g transform="rotate(-20, 11, 11)">
        <rect x="7" y="3" width="8" height="2" fill={c} />
        <rect x="5" y="5" width="2" height="12" fill={c} />
        <rect x="15" y="5" width="2" height="12" fill={c} />
        <rect x="7" y="17" width="8" height="2" fill={c} />
        <rect x="10" y="15" width="2" height="2" fill={c} />
      </g>
      <rect x="17" y="4" width="2" height="2" fill={c} />
      <rect x="19" y="2" width="2" height="2" fill={c} />
      <rect x="18" y="3" width="2" height="2" fill={c} opacity="0.4" />
    </svg>
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
      <span style={{ color: UIColors.dim, fontFamily: UI_BODY_FONT, fontSize: '0.9rem' }}>{label}</span>
    </div>
  );
}
