import { useEffect } from 'react';
import './App.css';
import { socket } from './socket.ts';
import { useSocketStore } from './store/socketStore.ts';

function App () {
  const connected = useSocketStore((s) => s.connected);

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
    </div>
  );
}

export default App;
