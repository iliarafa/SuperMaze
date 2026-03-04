import { Colors } from '../game/colors';

interface HowToPlayProps {
  onBack: () => void;
}

const font =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

export function HowToPlay({ onBack }: HowToPlayProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: Colors.background,
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
          color: Colors.accent,
          fontFamily: font,
          fontSize: '0.85rem',
          fontWeight: 300,
          letterSpacing: '0.05em',
          cursor: 'pointer',
          marginBottom: '2rem',
          padding: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        &larr; back
      </button>

      <h2
        style={{
          fontFamily: font,
          fontSize: '1.4rem',
          fontWeight: 200,
          letterSpacing: '0.15em',
          color: Colors.accent,
          textTransform: 'uppercase',
          marginBottom: '2rem',
          textAlign: 'center',
        }}
      >
        How to Play
      </h2>

      <Section title="The Idea">
        Two agents race through the same maze with different rules. The
        classical agent searches one path at a time. The quantum agent explores
        all paths simultaneously. You feel the difference.
      </Section>

      <Section title="Controls">
        <Row icon="👆" text="Swipe in any direction to move one cell" />
        <Row icon="👉" text="Tap an adjacent cell to move there" />
      </Section>

      <Divider />

      <ModeSection
        color={Colors.classicalPath}
        title="Race Mode"
        description="You control the classical agent (orange). A quantum wave (blue-green)
          expands automatically through the maze. Reach the exit before the wave
          collapses to its optimal path."
        insight="At small mazes you can win. At large mazes, quantum's advantage
          makes it nearly impossible. You'll feel the scaling difference."
      />

      <ModeSection
        color={Colors.exitNode}
        title="Observe & Collapse"
        description="A quantum wave expands from the start, exploring all paths.
          Hold anywhere to charge a collapse. Short hold = imprecise.
          Long hold = precise, optimal path."
        insight="Observing too early collapses the system before it has fully
          explored. Full superposition = full information = best result."
      />

      <Divider />

      <Section title="Visual Guide">
        <ColorRow color={Colors.classicalPath} label="Your path (active)" />
        <ColorRow color={Colors.classicalBacktrack} label="Backtracked path" />
        <ColorRow color={Colors.classicalCursor} label="Your position" />
        <ColorRow color="#00E5CC" label="Quantum wave" />
        <ColorRow color={Colors.exitNode} label="Optimal / exit" />
        <ColorRow color={Colors.startNode} label="Start node" />
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
          fontFamily: font,
          fontSize: '0.9rem',
          fontWeight: 500,
          letterSpacing: '0.08em',
          color: Colors.accent,
          marginBottom: '0.75rem',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h3>
      <div
        style={{
          fontFamily: font,
          fontSize: '0.82rem',
          fontWeight: 300,
          color: Colors.textPrimary,
          lineHeight: 1.7,
          opacity: 0.8,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModeSection({
  color,
  title,
  description,
  insight,
}: {
  color: string;
  title: string;
  description: string;
  insight: string;
}) {
  return (
    <div
      style={{
        marginBottom: '1.5rem',
        maxWidth: '360px',
        alignSelf: 'center',
        width: '100%',
        border: `1px solid ${color}`,
        borderRadius: '12px',
        padding: '1.2rem',
        background: `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.06), transparent)`,
      }}
    >
      <h3
        style={{
          fontFamily: font,
          fontSize: '0.95rem',
          fontWeight: 500,
          letterSpacing: '0.05em',
          color,
          marginBottom: '0.6rem',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: font,
          fontSize: '0.8rem',
          fontWeight: 300,
          color: Colors.textPrimary,
          lineHeight: 1.6,
          opacity: 0.8,
          marginBottom: '0.8rem',
        }}
      >
        {description}
      </p>
      <p
        style={{
          fontFamily: font,
          fontSize: '0.75rem',
          fontWeight: 300,
          fontStyle: 'italic',
          color: Colors.textPrimary,
          lineHeight: 1.5,
          opacity: 0.5,
        }}
      >
        {insight}
      </p>
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
      <span style={{ fontSize: '1rem', width: '1.5rem', textAlign: 'center' }}>
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: '40px',
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${Colors.wall}, transparent)`,
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
      <span>{label}</span>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
