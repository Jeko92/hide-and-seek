import { Injectable } from '@nestjs/common';
import {
  GRID_SIZE,
  Role,
  MatchState,
  Position,
  GAME_LENGTH_SECONDS,
} from './game.types';

interface SocketAssignment {
  roomId: string;
  role: Role;
}

@Injectable()
export class GameService {
  private socketAssignments = new Map<string, SocketAssignment>();
  private waitingRoomId: string | null = null;
  private roomCounter = 0;
  private matches = new Map<string, MatchState>();
  private readonly deltas: Record<string, Position> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  private timers = new Map<string, NodeJS.Timeout>();

  assignToRoom(socketId: string) {
    if (this.waitingRoomId === null) {
      const roomId = `room-${++this.roomCounter}`;
      this.waitingRoomId = roomId;
      const assignment: SocketAssignment = { roomId, role: 'hider' };
      this.socketAssignments.set(socketId, assignment);
      this.matches.set(roomId, {
        roomId,
        status: 'waiting',
        players: {
          hider: { socketId, position: { x: GRID_SIZE - 1, y: GRID_SIZE - 1 } },
          seeker: null,
        },
        timeRemaining: 0,
        winner: null,
      });
      return assignment;
    }

    const roomId = this.waitingRoomId;
    this.waitingRoomId = null;
    const assignment: SocketAssignment = { roomId, role: 'seeker' };
    this.socketAssignments.set(socketId, assignment);

    const match = this.matches.get(roomId)!;
    match.players.seeker = { socketId, position: { x: 0, y: 0 } };
    match.status = 'running';

    return assignment;
  }

  getMatch(roomId: string): MatchState | undefined {
    return this.matches.get(roomId);
  }

  applyMove(socketId: string, direction: string): MatchState | null {
    const assignment = this.socketAssignments.get(socketId);
    if (!assignment) return null;

    const match = this.matches.get(assignment.roomId);
    if (!match || match.status !== 'running') return null;

    const delta = this.deltas[direction];
    if (!delta) return null;

    const player = match.players[assignment.role]!;
    const target = {
      x: player.position.x + delta.x,
      y: player.position.y + delta.y,
    };

    if (
      target.x < 0 ||
      target.x >= GRID_SIZE ||
      target.y < 0 ||
      target.y >= GRID_SIZE
    ) {
      return null;
    }

    player.position = target;
    const seekerPos = match.players.seeker?.position;
    const hiderPos = match.players.hider?.position;
    if (
      seekerPos &&
      hiderPos &&
      seekerPos.x === hiderPos.x &&
      seekerPos.y === hiderPos.y
    ) {
      match.status = 'finished';
      match.winner = 'seeker';
      const timer = this.timers.get(match.roomId);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(match.roomId);
      }
    }
    return match;
  }

  startTimer(roomId: string, onTick: (match: MatchState) => void) {
    const match = this.matches.get(roomId);
    if (!match) return;
    match.timeRemaining = GAME_LENGTH_SECONDS;

    const timer = setInterval(() => {
      match.timeRemaining -= 1;
      if (match.timeRemaining <= 0) {
        match.status = 'finished';
        match.winner = 'hider';
        clearInterval(timer);
        this.timers.delete(roomId);
      }
      onTick(match);
    }, 1000);
    this.timers.set(roomId, timer);
  }

  handleDisconnect(socketId: string): MatchState | null {
    const assignment = this.socketAssignments.get(socketId);
    this.socketAssignments.delete(socketId);
    if (!assignment) return null;

    const match = this.matches.get(assignment.roomId);
    if (!match) return null;

    if (match.status === 'running') {
      match.status = 'finished';
      match.winner = assignment.role === 'seeker' ? 'hider' : 'seeker';
      const timer = this.timers.get(match.roomId);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(match.roomId);
      }
      return match;
    }

    return null;
  }
}
