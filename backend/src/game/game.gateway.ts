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
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly gameService: GameService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // const assignment = this.gameService.assignToRoom(client.id);
    // await client.join(assignment.roomId);
    // client.emit('role', { role: assignment.role });
    // const match = this.gameService.getMatch(assignment.roomId);
    // this.server.to(assignment.roomId).emit('matchState', match);
    //
    // if (match?.status === 'running') {
    //   this.gameService.startTimer(assignment.roomId, (m) => {
    //     this.server.to(assignment.roomId).emit('matchState', m);
    //   });
    // }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const match = this.gameService.handleDisconnect(client.id);
    if (match) {
      this.server.to(match.roomId).emit('matchState', match);
    }
  }

  @SubscribeMessage('ping')
  handlePing(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('received ping:', payload);
    client.emit('pong', { receivedAt: Date.now() });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() body: {roomName: string}, @ConnectedSocket() client: Socket){
    console.log('join room requested:', body.roomName, client.id);
    const result = this.gameService.joinNamedRoom(client.id, body.roomName);

    if('error' in result){
      client.emit('joinError', {reason: result.error})
      return;
    }
    client.join(body.roomName);
    client.emit('role', { role: result.role });
    const match = this.gameService.getMatch(body.roomName);
    this.server.to(body.roomName).emit('matchState', match);
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

  @SubscribeMessage('playAgain')
  handlePlayAgain(@ConnectedSocket() client: Socket) {
    const match = this.gameService.resetMatch(client.id);
    if (match) {
      this.server.to(match.roomId).emit('matchState', match);
      this.gameService.startTimer(match.roomId, (m) => {
        this.server.to(match.roomId).emit('matchState', m);
      });
    }
  }
}
