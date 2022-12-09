import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { ChatService } from './chat.service';


@WebSocketGateway({
  namespace: '24',
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private chatService: ChatService,
    private jwtService: JwtService
  ) {}

  @WebSocketServer() nsp: Namespace;
  private logger = new Logger(ChatGateway.name);

  async handleConnection(@ConnectedSocket() socket: Socket, @MessageBody() msg: any) {
    try {
      const sessionID = socket.handshake.auth.sessionID;
      if (sessionID && sessionID != "null" && sessionID != "undefined") {
        const session = await this.chatService.findUser(sessionID);
        if (session) {
          socket.data.sessionID = sessionID;
          socket.data.room = session.room;
          socket.data.user_id = session.user_id;
        } else {
          throw new Error("Try again!");
        }
      } else {
        const decoded = this.jwtService.decode(socket.handshake.query.token as string);
        if (!decoded['user_id']) {
          throw new Error("Token not provided!");
        }
        const newUser = await this.chatService.saveUser(decoded['user_id']);
        socket.data.sessionID = newUser.id;
        socket.data.room = newUser.room;
        socket.data.user_id = newUser.user_id;
      }
      socket.emit("session", { sessionID: socket.data.sessionID, userID: socket.data.room });
      socket.join(socket.data.room);
    } catch (e) {
      this.logger.log(`Error occured! ${e}`)
    }
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    this.chatService.userOffline(socket.data.user_id)
  }

  @SubscribeMessage('dm-message')
  async handleDM(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
    this.logger.log(msg);
    if (msg.msg && msg.receiver) {
      const insertedMSG = await this.chatService.saveDM(socket, msg);
      const to = await this.chatService.findRoom(msg.receiver);
      this.logger.log(to);
      socket.to(socket.data.room).emit("dm-message", insertedMSG)
      socket.to(to).emit('dm-message', insertedMSG)
    }
  }

  @SubscribeMessage('message')
    async handleMessage(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
    if (msg.msg && msg.receiver) {
      const insertedMSG = await this.chatService.saveChat(socket, msg);
      socket.to(msg.receiver).emit('message', insertedMSG);
      // const clients = this.nsp.adapter.rooms.get(msg.receiver)
      // for (const c of clients) {

      // }
    }
  }

  @SubscribeMessage('create-room')
  async createRoom(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
    const roomStatus = await this.chatService.createNewRoom(socket, msg);
    if (roomStatus == ``) {
      socket.join(msg.name);
    }
    return roomStatus;
  }

  @SubscribeMessage('edit-room')
  editRoom() {
  }

  @SubscribeMessage('join-room')
  async joinRoom(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
    this.logger.log(`Someone joined room named ${msg.name}!`)

    await this.chatService.joinChat(socket.data.user_id, msg.name);
    const messages = await this.chatService.getChat(msg.name);
    const user = await this.chatService.getUserBySocket(socket);
    socket.emit('messages', messages);
    if (user) {
      socket.to(msg.name).emit('fetch', user.nickname);
    }
    socket.join(msg.name);
  }

  @SubscribeMessage('leave-room')
  async leaveRoom(@ConnectedSocket() socket:Socket, @MessageBody() msg) {
    this.logger.log(`Someone leaved room named ${msg.name}!`)

    const user = await this.chatService.getUserBySocket(socket);
    if (user) {
      socket.to(msg.name).emit('fetch', user.nickname);
    }
    socket.leave(msg.name)
  }
}
