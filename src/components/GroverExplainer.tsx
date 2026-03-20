import { UIColors, UI_FONT, UI_BODY_FONT } from '../game/colors';

interface GroverExplainerProps {
  onBack: () => void;
}

export function GroverExplainer({ onBack }: GroverExplainerProps) {
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
        Grover's Algorithm
      </h2>

      <Section title="Lov Grover">
        In 1996, Indian-American computer scientist Lov Grover, working at Bell
        Labs, discovered a quantum algorithm that fundamentally changed how we
        think about search. He showed that a quantum computer could find a needle
        in a haystack quadratically faster than any classical approach — a result
        that remains one of the cornerstones of quantum computing.
      </Section>

      <Section title="The Search Problem">
        Imagine searching for one name in a phone book with 1,000,000 entries. A
        classical computer checks them one by one — in the worst case, all
        1,000,000. This is how most search works: linear, sequential, and slow as
        the problem grows.
      </Section>

      <Section title="Quantum Superposition">
        A quantum computer doesn't check one item at a time. It prepares a
        superposition — a state where every possible answer exists simultaneously,
        each with an equal probability amplitude. Think of it as exploring every
        path in a maze at once, rather than picking one and hoping for the best.
      </Section>

      <Divider />

      <Section title="How Grover's Algorithm Works">
        Grover's algorithm amplifies the correct answer through repetition. Each
        iteration does two things: (1) marks the correct answer by flipping its
        amplitude, and (2) amplifies that marked answer while dampening the rest.
        After roughly {'\u221A'}N iterations (where N is the number of
        possibilities), the correct answer's probability dominates. For 1,000,000
        entries, that's only ~1,000 steps instead of 1,000,000.
      </Section>

      <Section title="Why It Matters">
        The speedup is quadratic: {'\u221A'}N vs N. At small scales, the
        difference is modest — {'\u221A'}25 = 5 vs 25. But as problems grow, the
        gap becomes dramatic. At 1,000,000 items, you save 999,000 steps. This is
        one of the foundational results in quantum computing, proven by Lov Grover
        in 1996.
      </Section>

      <Divider />

      <Section title="In This Game">
        The game maps these concepts to what you see and feel:
      </Section>

      <Section title="">
        <ConceptRow
          label="Wave expansion"
          description="= superposition. The blue-green wave flooding the maze represents all paths being explored at once."
        />
        <ConceptRow
          label="Brighter cells"
          description="= higher amplitude. Cells on or near the optimal path glow brighter, just as Grover's algorithm amplifies the correct answer."
        />
        <ConceptRow
          label="Collapse"
          description="= measurement. When the wave collapses, one path is chosen — the quantum state becomes a definite answer."
        />
        <ConceptRow
          label="Optimal path"
          description="= amplification working. The collapsed path tends toward the shortest route, showing that amplification found the right answer."
        />
      </Section>

      <Divider />

      <Section title="The Scaling Gap">
        On a 25{'\u00D7'}25 maze (625 cells), you might explore hundreds of cells
        backtracking through dead ends. A quantum search needs roughly{' '}
        {'\u221A'}625 = 25 steps. As mazes grow larger, this gap becomes
        impossible to overcome — you feel the quantum advantage through gameplay.
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
      {title && (
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
      )}
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

function ConceptRow({ label, description }: { label: string; description: string }) {
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <span style={{ color: UIColors.highlight, fontFamily: UI_BODY_FONT, fontSize: '0.95rem' }}>
        {label}
      </span>
      <span style={{ color: UIColors.dim, fontFamily: UI_BODY_FONT, fontSize: '0.95rem' }}>
        {' '}{description}
      </span>
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
