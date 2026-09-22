import { Injectable } from '@nestjs/common';
import {
  GAME_LENGTH_SECONDS,
  GRID_SIZE,
  MatchState,
  Position,
  Role,
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

  private edgeKey(a: Position, b: Position): string {
    const [p1, p2] =
      a.y < b.y || (a.y === b.y && a.x < b.x) ? [a, b] : [b, a];
    return `${p1.x},${p1.y}-${p2.x},${p2.y}`;
  }

  private neighbors(pos: Position, gridSize: number): Position[] {
    return [
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
    ].filter((p) => p.x >= 0 && p.x < gridSize && p.y >= 0 && p.y < gridSize);
  }

  private wouldFullyEnclose(
    pos: Position,
    gridSize: number,
    wallEdges: Set<string>,
  ): boolean {
    const cellNeighbors = this.neighbors(pos, gridSize);
    return cellNeighbors.every((n) => wallEdges.has(this.edgeKey(pos, n)));
  }

  private isConnected(gridSize: number, wallEdges: Set<string>): boolean {
    const visited = new Set<string>(['0,0']);
    const queue: Position[] = [{ x: 0, y: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of this.neighbors(current, gridSize)) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (visited.has(key)) continue;
        if (wallEdges.has(this.edgeKey(current, neighbor))) continue;
        visited.add(key);
        queue.push(neighbor);
      }
    }

    return visited.size === gridSize * gridSize;
  }

  private generateWalls(gridSize: number, avoid: Position[]): string[] {
    const wallEdges = new Set<string>();
    const avoidKeys = new Set(avoid.map((p) => `${p.x},${p.y}`));
    const directionKeys = Object.keys(this.deltas);
    const numPieces = Math.floor(gridSize * 1.5);

    for (let i = 0; i < numPieces; i++) {
      let current: Position = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize),
      };
      const pieceLength = 1 + Math.floor(Math.random() * 4);
      let directionKey =
        directionKeys[Math.floor(Math.random() * directionKeys.length)];

      for (let step = 0; step < pieceLength; step++) {
        if (step > 0 && Math.random() < 0.3) {
          directionKey =
            directionKeys[Math.floor(Math.random() * directionKeys.length)];
        }
        const delta = this.deltas[directionKey];
        const next = { x: current.x + delta.x, y: current.y + delta.y };

        if (
          next.x < 0 ||
          next.x >= gridSize ||
          next.y < 0 ||
          next.y >= gridSize
        ) {
          break;
        }

        const currentKey = `${current.x},${current.y}`;
        const nextKey = `${next.x},${next.y}`;
        if (avoidKeys.has(currentKey) || avoidKeys.has(nextKey)) {
          break;
        }

        const key = this.edgeKey(current, next);
        wallEdges.add(key);

        if (
          this.wouldFullyEnclose(current, gridSize, wallEdges) ||
          this.wouldFullyEnclose(next, gridSize, wallEdges) ||
          !this.isConnected(gridSize, wallEdges)
        ) {
          wallEdges.delete(key);
          break;
        }

        current = next;
      }
    }

    return Array.from(wallEdges);
  }

  private isBlocked(from: Position, to: Position, match: MatchState): boolean {
    return match.wallEdges.includes(this.edgeKey(from, to));
  }

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
        wallEdges: this.generateWalls(GRID_SIZE, [
          { x: GRID_SIZE - 1, y: GRID_SIZE - 1 },
          { x: 0, y: 0 },
        ]),
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

  joinNamedRoom(socketId: string, roomName: string): { role: Role } | { error: 'full' } {
    const existing = this.matches.get(roomName);

    if(!existing){
      const assignment = { roomId: roomName, role: 'hider' as Role };
      this.socketAssignments.set(socketId, assignment);
      this.matches.set(roomName, {
        roomId: roomName,
        status: 'waiting',
        players: { hider: { socketId, position: { x: GRID_SIZE - 1, y: GRID_SIZE - 1 } }, seeker: null },
        timeRemaining: 0,
        winner: null,
        wallEdges: this.generateWalls(GRID_SIZE, [
          { x: GRID_SIZE - 1, y: GRID_SIZE - 1 },
          { x: 0, y: 0 },
        ]),
      });
      return { role: 'hider' };
    }

    if (existing.players.seeker === null) {
      const assignment = { roomId: roomName, role: 'seeker' as Role };
      this.socketAssignments.set(socketId, assignment);
      existing.players.seeker = { socketId, position: {x:0, y:0 } };
      existing.status = 'running';
      return { role: 'seeker' };
    }

    return { error: 'full' };
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

    if (this.isBlocked(player.position, target, match)) {
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

    if (
      this.waitingRoomId === assignment.roomId &&
      match.status === 'waiting'
    ) {
      this.waitingRoomId = null;
      this.matches.delete(assignment.roomId);
      return null;
    }

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

  resetMatch(socketId: string): MatchState | null {
    const assignment = this.socketAssignments.get(socketId);
    if (!assignment) return null;

    const match = this.matches.get(assignment.roomId);
    if (!match || !match.players.seeker || !match.players.hider) return null;

    match.status = 'running';
    match.winner = null;
    match.players.hider.position = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
    match.players.seeker.position = { x: 0, y: 0 };
    return match;
  }
}
