import { create } from 'zustand/react';
import { socket } from '../socket.ts';
import type { MatchState } from '../types.ts';

interface SocketState {
  connected: boolean;
  role: 'seeker' | 'hider' | null;
  matchState: MatchState | null;
  move: (direction: string) => void;
  playAgain: () => void;
  joinError: string | null;
  clearJoinError: () => void;
}

export const useSocketStore = create<SocketState>()((set) => {
  socket.on('connect', () => {
    set({ connected: true });
    socket.emit('ping', { hello: 'world' });
  });
  socket.on('disconnect', () => set({ connected: false }));
  socket.on('pong', (data: { receivedAt: number }) => {
    console.log('received pong', data);
  });
  socket.on('role', (data: { role: 'seeker' | 'hider' }) => {
    set({ role: data.role, joinError: null });
  });
  socket.on('matchState', (state: MatchState) => {
    set({ matchState: state });
  });
  socket.on('joinError', (data: { reason: string }) => set({ joinError: data.reason }));

  return {
    connected: socket.connected,
    role: null,
    matchState: null,
    move: (direction: string) => socket.emit('move', { direction }),
    playAgain: () => socket.emit('playAgain'),
    joinError: null,
    clearJoinError: () => set({ joinError: null }),
  };
});
