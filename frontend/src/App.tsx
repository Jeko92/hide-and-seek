import { useEffect } from 'react';
import './App.css';
import { socket } from './socket.ts';
import { useSocketStore } from './store/socketStore.ts';

function App () {
  const connected = useSocketStore((s) => s.connected);
  const role = useSocketStore((s) => s.role);

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
    </div>
  );
}

export default App;
