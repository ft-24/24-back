import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { GameService } from './game.service';
import { Direction } from './lib/lib/Directions';
import GameEngine from './lib/lib/GameEngine';
import { v4 as uuid } from 'uuid';

let Games: GameEngine[] = [];
let PrivateGames: GameEngine[] = [];
let LadderGames: GameEngine[] = [];

@WebSocketGateway({
  namespace: '24',
})
export class GameGateway
  implements OnGatewayDisconnect {
    constructor (
      private gameService: GameService
    ){}

    @WebSocketServer() nsp: Namespace;
    private logger = new Logger(GameGateway.name);

    // afterInit(server: any) {
    //     Games.push(new GameEngine(uuid(), 'Hello', 'public'));
    // }

    @SubscribeMessage('refresh')
    async sendBackRoomList(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
      socket.emit('list', await this.gameService.getPublicRooms(Games, socket));
    }

    @SubscribeMessage('get')
    async getRoomInfo(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
      const room = this.gameService.getGameById([...Games, ...PrivateGames, ...LadderGames], msg.id);
      if (room) {
        const info = await this.gameService.getInfoByGame(room, socket);
        socket.emit('get', info)
      }
    }

    @SubscribeMessage('queue')
    queuePlayer(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
      const foundRoom = this.gameService.matchMaking(LadderGames);
      if (foundRoom) {
        foundRoom.join(socket);
        this.nsp.to(foundRoom.getID()).emit('enter-room', this.gameService.getInfoByGame(foundRoom, socket))
      } else {
        const newRoomID = uuid();
        const creadtedGame = LadderGames.push(new GameEngine(``, newRoomID, `ladder`, this.nsp));
        LadderGames[creadtedGame - 1].join(socket);
      }
      // LadderGames 에 현재 대기 중인 게임이 있는지 확인, 있다면 join 후 enter-room emit
      // 대기 중인 게임이 없다면 LadderGames에 새로운 방 생성 후 join
    }

    @SubscribeMessage('make-room')
    makeRoom(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
      if (msg.access_modifier == 'public') {
        this.logger.log(`Making new ${msg.access_modifier} room, ${msg.name}.`)
        const newRoomID = uuid();
        const creadtedGame = Games.push(new GameEngine(newRoomID, msg.name, msg.access_modifier, this.nsp));
        // Games[creadtedGame - 1].join(socket);
        this.nsp.emit('new-room', { id: newRoomID, name: msg.name })
        return newRoomID;
      }
      // msg에 포함된 name과 임의로 생성한 id로 새로운 게임 생성, 그 후 join
      // room이 새로 생겼으므로 모든 소켓에게 새로운 방이 생성되었음을 emit, id & name
    }

    @SubscribeMessage('join')
    joinPlayer(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
      const joiningRoom = this.gameService.getGameById([...Games, ...PrivateGames, ...LadderGames], msg.id);
      if (joiningRoom) {
        joiningRoom.join(socket)
        this.nsp.to(joiningRoom.getID()).emit('enter-room', this.gameService.getInfoByGame(joiningRoom, socket))
      }
      // 주어진 id에 해당하는 게임이 있는지 확인, 존재한다면 join 후 enter-room emit
      // 먼저 방에 존재했던 socket에게도 enter-room emit
    }

    @SubscribeMessage('leave')
    removePlayer(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
      const joinedGame = this.gameService.getJoinedGame([...Games, ...PrivateGames, ...LadderGames], socket);
      if (joinedGame) {

      }
      
      // socket이 join 되어있는 게임을 받고, 해당 게임의 disconnect 함수를 호출
      // 필요하다면 방이 삭제되고 방 리스트를 emit
      // 필요하다면 소켓에게 leave-room emit
    }

    @SubscribeMessage('ready')
    playerReady(@ConnectedSocket() socket: Socket, @MessageBody() msg) {
      const joinedGame = this.gameService.getJoinedGame([...Games, ...PrivateGames, ...LadderGames], socket);
      if (joinedGame) { 
        joinedGame.ready(socket, msg.is_ready, this.gameService);
      }
      // socket이 join 되어있는 게임을 받고, 해당 게임의 ready 함수를 소켓과 상태를 파라미터로 호출
    }

    @SubscribeMessage('move')
    movePlayer(@ConnectedSocket() socket: Socket, @MessageBody() dir: Direction) {
      const joinedGame = this.gameService.getJoinedGame([...Games, ...PrivateGames, ...LadderGames], socket);
      if (joinedGame) {
        joinedGame.move(socket, dir);
      } 
    }

    handleDisconnect(@ConnectedSocket() socket: Socket) {
      // const joinedGame = this.gameService.getJoinedGame([...Games, ...PrivateGames, ...LadderGames], socket);
      // if (joinedGame) {
      //   joinedGame.disconnect(socket)
      // }
      // socket이 join 되어있던 게임을 받고, 해당 게임의 disconnect 함수를 호출
      // 필요하다면 방이 삭제되고 방 리스트를 emit
    }
}