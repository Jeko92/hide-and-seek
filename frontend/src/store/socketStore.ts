import { create } from 'zustand/react';
import { socket } from '../socket.ts';

interface SocketState {
  connected: boolean;
}

export const useSocketStore = create<SocketState>()((set)=>{
  socket.on('connect', () => set({connected: true}));
  socket.on('disconnect', () => set({connected: false}));

  return {
    connected: socket.connected,
  }
});
