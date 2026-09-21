import { Injectable } from '@nestjs/common';

@Injectable()
export class GameService {
  assignToRoom(socketId: string) {
    return {roomId: 'room-1', role: 'seeker' as const};
  }
}
