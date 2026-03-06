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
import { Settings } from './components/Settings';
import { UIColors } from './game/colors';
import { useSettings } from './game/settings';

type Screen = 'landing' | 'modeSelect' | 'howToPlay' | 'settings' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<GameMode>('race');
  const maze = useMemo(() => generateMaze(25, 25, 42), []);
  const agentState = useRef(createAgentState(maze));
  const quantumState = useRef<QuantumAgentState | null>(null);

  const [settings] = useSettings();

  const goToModeSelect = useCallback(() => setScreen('modeSelect'), []);
  const goToHowToPlay = useCallback(() => setScreen('howToPlay'), []);
  const goToSettings = useCallback(() => setScreen('settings'), []);
  const goToLanding = useCallback(() => setScreen('landing'), []);

  const handleSelectMode = useCallback((selectedMode: GameMode) => {
    setMode(selectedMode);
    quantumState.current = selectedMode === 'observe' ? createQuantumState(maze) : null;
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
        onSettings={goToSettings}
        onBack={goToLanding}
      />
    );
  }

  if (screen === 'howToPlay') {
    return <HowToPlay onBack={goToModeSelect} />;
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
        maze={maze}
        agentState={mode === 'race' ? agentState.current : undefined}
        quantumState={quantumState.current ?? undefined}
        mode={mode}
        joystickEnabled={settings.joystickEnabled}
        onBack={goToModeSelect}
      />
    </div>
  );
}

export default App;
