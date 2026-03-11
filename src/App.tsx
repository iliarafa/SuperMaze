import { useRef, useState, useCallback } from 'react';
import { generateMaze } from './game/maze';
import { createAgentState } from './game/classicalAgent';
import { createQuantumState } from './game/quantumAgent';
import type { QuantumAgentState } from './game/quantumAgent';
import { MazeRenderer } from './components/MazeRenderer';
import { LandingPage } from './components/LandingPage';
import { ModeSelect } from './components/ModeSelect';
import type { GameMode } from './components/ModeSelect';
import { HowToPlay } from './components/HowToPlay';
import { GroverExplainer } from './components/GroverExplainer';
import { Settings } from './components/Settings';
import { UIColors } from './game/colors';
import { useSettings } from './game/settings';

type Screen = 'landing' | 'modeSelect' | 'howToPlay' | 'grover' | 'settings' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<GameMode>('race');
  const [gameKey, setGameKey] = useState(0);
  const mazeRef = useRef(generateMaze(25, 25, Date.now()));
  const agentState = useRef(createAgentState(mazeRef.current));
  const quantumState = useRef<QuantumAgentState | null>(null);

  const [settings] = useSettings();

  const goToModeSelect = useCallback(() => setScreen('modeSelect'), []);
  const goToHowToPlay = useCallback(() => setScreen('howToPlay'), []);
  const goToGrover = useCallback(() => setScreen('grover'), []);
  const goToSettings = useCallback(() => setScreen('settings'), []);
  const goToLanding = useCallback(() => setScreen('landing'), []);

  const startNewGame = useCallback((selectedMode: GameMode) => {
    const newMaze = generateMaze(25, 25, Date.now());
    mazeRef.current = newMaze;
    agentState.current = createAgentState(newMaze);
    quantumState.current = selectedMode === 'observe' ? createQuantumState(newMaze) : null;
    setMode(selectedMode);
    setGameKey(k => k + 1);
    setScreen('game');
  }, []);

  const handleSelectMode = startNewGame;

  const handleRetry = useCallback(() => {
    startNewGame(mode);
  }, [startNewGame, mode]);

  if (screen === 'landing') {
    return <LandingPage onStart={goToModeSelect} />;
  }

  if (screen === 'modeSelect') {
    return (
      <ModeSelect
        onSelectMode={handleSelectMode}
        onHowToPlay={goToHowToPlay}
        onGrover={goToGrover}
        onSettings={goToSettings}
        onBack={goToLanding}
      />
    );
  }

  if (screen === 'howToPlay') {
    return <HowToPlay onBack={goToModeSelect} />;
  }

  if (screen === 'grover') {
    return <GroverExplainer onBack={goToModeSelect} />;
  }

  if (screen === 'settings') {
    return <Settings onBack={goToModeSelect} />;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: UIColors.bg,
        padding: '1.5rem',
        paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
      }}
    >
      <MazeRenderer
        key={gameKey}
        maze={mazeRef.current}
        agentState={mode === 'race' ? agentState.current : undefined}
        quantumState={quantumState.current ?? undefined}
        mode={mode}
        joystickEnabled={settings.joystickEnabled}
        tiltEnabled={settings.tiltEnabled}
        onBack={goToModeSelect}
        onRetry={handleRetry}
      />
    </div>
  );
}

export default App;
