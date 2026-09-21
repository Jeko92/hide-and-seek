import { create } from 'zustand/react';
import { socket } from '../socket.ts';

interface SocketState {
  connected: boolean;
}

export const useSocketStore = create<SocketState>()(( set ) => {
  socket.on('connect', () => {
    set({ connected: true });
    socket.emit('ping', { hello: 'world' });
  });
  socket.on('disconnect', () => set({ connected: false }));
  socket.on('pong', ( data: { receivedAt: number } ) => {
    console.log('received pong', data);
  });

  return {
    connected: socket.connected,
  };
});
