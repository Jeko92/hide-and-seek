import { useEffect } from 'react';
import './App.css';
import { socket } from './socket.ts';
import { useSocketStore } from './store/socketStore.ts';
import { Grid } from './components/Grid.tsx';

function App() {
  const connected = useSocketStore((s) => s.connected);
  const role = useSocketStore((s) => s.role);
  const matchState = useSocketStore((s) => s.matchState);
  const move = useSocketStore((s) => s.move);
  const playAgain = useSocketStore((s) => s.playAgain);

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (matchState?.status === 'finished') return;

      const map: Record<string, string> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };

      const direction = map[e.key];
      if (direction) move(direction);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [move]);

  return (
    <div>
      <h1>Hide and Seek</h1>
      <p>{connected ? 'Connected' : 'Connecting...'}</p>
      <p>{role ? `You are the ${role}` : 'Assigning role...'}</p>
      {matchState?.status === 'finished' && (
        <div>
          <p>
            {matchState.winner === 'seeker' ? 'Seeker wins!' : 'Hider wins!'}
          </p>
          <button onClick={playAgain}>Play Again</button>
        </div>
      )}
      {matchState && (
        <>
          <p>Time left: {matchState.timeRemaining}s</p>
          <Grid match={matchState} />
        </>
      )}
    </div>
  );
}

export default App;
