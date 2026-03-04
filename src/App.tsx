import { useMemo, useRef, useState, useCallback } from 'react';
import { generateMaze } from './game/maze';
import { createAgentState } from './game/classicalAgent';
import { MazeRenderer } from './components/MazeRenderer';
import { LandingPage } from './components/LandingPage';
import { ModeSelect } from './components/ModeSelect';
import type { GameMode } from './components/ModeSelect';
import { HowToPlay } from './components/HowToPlay';
import { Colors } from './game/colors';

type Screen = 'landing' | 'modeSelect' | 'howToPlay' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [_mode, setMode] = useState<GameMode>('race');
  const maze = useMemo(() => generateMaze(25, 25, 42), []);
  const agentState = useRef(createAgentState(maze));

  const goToModeSelect = useCallback(() => setScreen('modeSelect'), []);
  const goToHowToPlay = useCallback(() => setScreen('howToPlay'), []);
  const goToLanding = useCallback(() => setScreen('landing'), []);

  const handleSelectMode = useCallback((mode: GameMode) => {
    setMode(mode);
    setScreen('game');
  }, []);

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
      <MazeRenderer maze={maze} agentState={agentState.current} />
    </div>
  );
}

export default App;
