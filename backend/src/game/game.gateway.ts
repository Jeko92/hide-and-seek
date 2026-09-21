import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly gameService: GameService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const assignment = this.gameService.assignToRoom(client.id);
    await client.join(assignment.roomId);
    client.emit('role', { role: assignment.role });
    const match = this.gameService.getMatch(assignment.roomId);
    this.server.to(assignment.roomId).emit('matchState', match);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('received ping:', payload);
    client.emit('pong', { receivedAt: Date.now() });
  }

  @SubscribeMessage('move')
  handleMove(
    @MessageBody() body: { direction: string },
    @ConnectedSocket() client: Socket,
  ) {
    const match = this.gameService.applyMove(client.id, body.direction);
    if (match) {
      this.server.to(match.roomId).emit('matchState', match);
    }
  }
}
