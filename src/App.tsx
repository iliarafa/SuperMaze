import { useMemo, useRef, useState, useCallback } from 'react';
import { generateMaze } from './game/maze';
import { createAgentState } from './game/classicalAgent';
import { createQuantumState } from './game/quantumAgent';
import type { QuantumAgentState } from './game/quantumAgent';
import { MazeRenderer } from './components/MazeRenderer';
import { LandingPage } from './components/LandingPage';
import { ModeSelect } from './components/ModeSelect';
import type { GameMode } from './components/ModeSelect';
import { HowToPlay } from './components/HowToPlay';
import { Colors } from './game/colors';

type Screen = 'landing' | 'modeSelect' | 'howToPlay' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<GameMode>('race');
  const maze = useMemo(() => generateMaze(25, 25, 42), []);
  const agentState = useRef(createAgentState(maze));
  const quantumState = useRef<QuantumAgentState | null>(null);

  const goToModeSelect = useCallback(() => setScreen('modeSelect'), []);
  const goToHowToPlay = useCallback(() => setScreen('howToPlay'), []);
  const goToLanding = useCallback(() => setScreen('landing'), []);

  const handleSelectMode = useCallback((selectedMode: GameMode) => {
    setMode(selectedMode);
    if (selectedMode === 'observe') {
      quantumState.current = createQuantumState(maze);
    }
    setScreen('game');
  }, [maze]);

  if (screen === 'landing') {
    return <LandingPage onStart={goToModeSelect} />;
  }

  if (screen === 'modeSelect') {
    return (
      <ModeSelect
        onSelectMode={handleSelectMode}
        onHowToPlay={goToHowToPlay}
        onBack={goToLanding}
      />
    );
  }

  if (screen === 'howToPlay') {
    return <HowToPlay onBack={goToModeSelect} />;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: Colors.background,
      }}
    >
      <MazeRenderer
        maze={maze}
        agentState={mode === 'race' ? agentState.current : undefined}
        quantumState={mode === 'observe' ? quantumState.current ?? undefined : undefined}
      />
    </div>
  );
}

export default App;
