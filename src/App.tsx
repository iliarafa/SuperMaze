import { useMemo, useRef, useState, useCallback } from 'react';
import { generateMaze } from './game/maze';
import { createAgentState } from './game/classicalAgent';
import { MazeRenderer } from './components/MazeRenderer';
import { LandingPage } from './components/LandingPage';
import { Colors } from './game/colors';

function App() {
  const [screen, setScreen] = useState<'landing' | 'game'>('landing');
  const maze = useMemo(() => generateMaze(25, 25, 42), []);
  const agentState = useRef(createAgentState(maze));

  const handleStart = useCallback(() => setScreen('game'), []);

  if (screen === 'landing') {
    return <LandingPage onStart={handleStart} />;
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
