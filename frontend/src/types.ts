export type Role = 'seaker' | 'hider';
export type GameStatus = 'waiting' | 'running' | 'finished';

export interface Position {
  x: number;
  y: number;
}

export interface PlayerInfo {
  sockedId: string;
  position: Position;
}

export interface MatchState {
  roomId: string;
  status: GameStatus;
  players: {
    seeker: PlayerInfo | null;
    hider: PlayerInfo | null;
  };
  timeRemaining: number;
  winner: Role | null;
}

export const GRID_SIZE = 10;
export const GAME_LENGTH_SECONDS = 60;
