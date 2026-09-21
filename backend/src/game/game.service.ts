import { Injectable } from '@nestjs/common';

type Role = 'seeker' | 'hider';

interface SocketAssignment {
  roomId: string;
  role: Role;
}

@Injectable()
export class GameService {
  private socketAssignments = new Map<string, SocketAssignment>();
  private waitingRoomId: string | null = null;
  private roomCounter = 0;

  assignToRoom(socketId: string) {
    if (this.waitingRoomId === null) {
      const roomId = `room-${++this.roomCounter}`;
      this.waitingRoomId = roomId;
      const assignment: SocketAssignment = { roomId, role: 'hider' };
      this.socketAssignments.set(socketId, assignment);
      return assignment;
    }

    const roomId = this.waitingRoomId;
    this.waitingRoomId = null;
    const assignment: SocketAssignment = { roomId, role: 'seeker' };
    this.socketAssignments.set(socketId, assignment);
    return assignment;
  }
}
