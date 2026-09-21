import { useEffect } from 'react';
import './App.css';
import { socket } from './socket.ts';
import { useSocketStore } from './store/socketStore.ts';
import { Grid } from './components/Grid.tsx';

function App() {
  const connected = useSocketStore((s) => s.connected);
  const role = useSocketStore((s) => s.role);
  const matchState = useSocketStore((s) => s.matchState);

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>Hide and Seek</h1>
      <p>{connected ? 'Connected' : 'Connecting...'}</p>
      <p>{role ? `You are the ${role}` : 'Assigning role...'}</p>
      {matchState && <Grid match={matchState} />}
    </div>
  );
}

export default App;
