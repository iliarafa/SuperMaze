import { useMemo, useRef } from 'react';
import { generateMaze } from './game/maze';
import { createAgentState } from './game/classicalAgent';
import { MazeRenderer } from './components/MazeRenderer';
import { Colors } from './game/colors';

function App() {
  const maze = useMemo(() => generateMaze(25, 25, 42), []);
  const agentState = useRef(createAgentState(maze));

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
