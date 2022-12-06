import Utils from './Utils';
import Scene from './Scene';
import MainScene from '../scene/Mainscene';
import { Direction } from './Directions';
import { Namespace, Socket } from 'socket.io';
import { GameService } from 'src/game/game.service';
import EndScene from '../scene/EndScene';

namespace Pong {

  export class GameEngine {

    private scene!: Scene;
    private id: string;
    private name: string;
    private acc: string;
    private nsp: Namespace;
    private player1: Socket = undefined;
    private player2: Socket = undefined;
    private player1_id: number = undefined;
    private player2_id: number = undefined;
    private spec_id: number[] = [];
    private ended: boolean = false;

    constructor(id: string, name: string, acc: string) {
      this.id = id;
      this.name = name;
      this.acc = acc;
    }
    
    start(gameService: GameService) {
      let menu = new MainScene(gameService, this);
      let startTime: number = Date.now();
      let timestamp: number = startTime;

      this.loadScene(menu);

      setInterval(() => {
        if (!this.ended) {
          let deltaTime = (startTime - timestamp) * 0.06;
          this.scene.update(deltaTime);
          
          const draw = this.scene.draw();
          if (draw['ball']) {
            this.nsp.to(this.id).emit('draw', draw);
          }
         
          timestamp = startTime;
          startTime = Date.now();
        }
      }, 1000 / 60); // 60 == FPS
    }

    ready() {
      
    }

    disconnect() {

    }

    join(socket: Socket) {
      socket.join(this.id)
      if (this.player1 == undefined) {
        this.player1 = socket;
        this.player1_id = socket.data.user_id;
      } else if (this.player2 == undefined) {
        this.player2 = socket;
        this.player2_id = socket.data.user_id;
      } else {
        this.spec_id.push(socket.data.user_id)
      }
    }

    move(socket: Socket, dir: Direction) {
      if (socket == this.player1) {
        this.scene.getInput(1, dir);
      } else if (socket == this.player2) {
        this.scene.getInput(2, dir);
      }
    }

    gameResult(result) {
      this.nsp.to(this.id).emit('result', result);
      this.ended = true;
    }

    getPlayer1() { if (this.player1) { return this.player1_id; }}
    getPlayer2() { if (this.player2) { return this.player2_id; }}
    getSpec() { return this.spec_id }
    getID() { return this.id }
    getName() { return this.name }
    getAccess() { return this.acc }

    loadScene(newScene: Scene, params?: object) {
      // If a scene has been loaded already, unload it
      if (this.scene) {
        this.scene.unload();
      }
      this.scene = newScene;
      this.scene.setGameContext(this);

      if (params === undefined) {
        params = {};
      }
      this.scene.load(params);
    }

  }
}

export default Pong.GameEngine;
