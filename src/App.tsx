import { useMemo } from 'react';
import { generateMaze } from './game/maze';
import { MazeRenderer } from './components/MazeRenderer';
import { Colors } from './game/colors';

function App() {
  const maze = useMemo(() => generateMaze(25, 25, 42), []);

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
      <MazeRenderer maze={maze} />
    </div>
  );
}

export default App;
