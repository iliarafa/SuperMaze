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
          fontSize: '0.4rem',
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
          fontSize: '0.6rem',
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

      <Section title="The Idea">
        Two agents race through the same maze with different rules. The
        classical agent searches one path at a time. The quantum agent explores
        all paths simultaneously. You feel the difference.
      </Section>

      <Section title="Controls">
        <Row icon=">" text="Swipe in any direction to move one cell" />
        <Row icon=">" text="Tap an adjacent cell to move there" />
      </Section>

      <Divider />

      <ModeSection
        title="Race Mode"
        description="You control the classical agent (orange). A quantum wave (blue-green)
          expands automatically through the maze. Reach the exit (bottom-right
          corner) before the wave collapses to its optimal path."
        rules={[
          'You win: reach the green exit cell before the quantum agent finishes travelling.',
          'You lose: the quantum wave collapses and its dot reaches the exit first.',
          'Game ends when either agent reaches the exit.',
        ]}
        insight="At small mazes you can win. At large mazes, quantum's advantage
          makes it nearly impossible. You'll feel the scaling difference."
      />

      <ModeSection
        title="Observe & Collapse"
        description="A quantum wave expands from the start, exploring all paths.
          Once it reaches 50%, hold anywhere to charge a collapse. Release to
          collapse the wave into a single path."
        rules={[
          'Short hold (< 1/3 charge): imprecise collapse, up to 3 wrong turns.',
          'Medium hold (1/3 – 4/5 charge): 1 wrong turn allowed.',
          'Long hold (> 4/5 charge): perfect collapse onto the optimal path.',
          'Game ends when the collapsed path is fully travelled to the exit.',
        ]}
        insight="Observing too early collapses the system before it has fully
          explored. Full superposition = full information = best result.
          Green path = optimal. Orange path = suboptimal."
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
          fontFamily: UI_FONT,
          fontSize: '0.4rem',
          fontWeight: 400,
          letterSpacing: '0.08em',
          color: UIColors.primary,
          marginBottom: '0.75rem',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h3>
      <div
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.3rem',
          fontWeight: 400,
          color: UIColors.dim,
          lineHeight: 2.0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModeSection({
  title,
  description,
  rules,
  insight,
}: {
  title: string;
  description: string;
  rules: string[];
  insight: string;
}) {
  return (
    <div
      style={{
        marginBottom: '1.5rem',
        maxWidth: '360px',
        alignSelf: 'center',
        width: '100%',
        border: `1px solid ${UIColors.primary}`,
        borderRadius: 0,
        padding: '1.2rem',
        background: 'none',
      }}
    >
      <h3
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.45rem',
          fontWeight: 400,
          letterSpacing: '0.05em',
          color: UIColors.highlight,
          marginBottom: '0.6rem',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.3rem',
          fontWeight: 400,
          color: UIColors.dim,
          lineHeight: 2.0,
          marginBottom: '0.6rem',
        }}
      >
        {description}
      </p>
      <ul
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.28rem',
          fontWeight: 400,
          color: UIColors.dim,
          lineHeight: 2.0,
          marginBottom: '0.8rem',
          paddingLeft: '1.2rem',
        }}
      >
        {rules.map((rule, i) => (
          <li key={i} style={{ marginBottom: '0.25rem' }}>{rule}</li>
        ))}
      </ul>
      <p
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.25rem',
          fontWeight: 400,
          color: UIColors.dim,
          lineHeight: 2.0,
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
      <span style={{ color: UIColors.primary, fontFamily: UI_FONT, fontSize: '0.28rem' }}>{label}</span>
    </div>
  );
}
