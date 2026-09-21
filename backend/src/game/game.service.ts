import { Injectable } from '@nestjs/common';
import { GRID_SIZE, Role, MatchState } from './game.types';

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
}
