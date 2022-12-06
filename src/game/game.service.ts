import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Socket } from 'socket.io';
import { FriendListEntity } from 'src/user/entity/friendList.entity';
import { UserEntity } from 'src/user/entity/user.entity';
import { UserStatsEntity } from 'src/user/entity/userStats.entity';
import { Repository } from 'typeorm';
import { GameResultEntity } from './entities/gameResult.entity';
import GameEngine from './lib/lib/GameEngine';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    @InjectRepository(UserStatsEntity) private userStatsRepository: Repository<UserStatsEntity>,
    @InjectRepository(FriendListEntity) private friendListRepository: Repository<FriendListEntity>,
    @InjectRepository(GameResultEntity) private gameResultRepository: Repository<GameResultEntity>
  ) {}

  async insertGameResult(result) {
    const insertedResult = await (await this.gameResultRepository.insert(result)).raw[0];
    const user1 = await this.userRepository.findOneBy({ id: insertedResult.user1_id });
    const user2 = await this.userRepository.findOneBy({ id: insertedResult.user2_id });
    return ({
      p1: user1.nickname,
      p2: user2.nickname,
      win: result.win,
      p1_score: result.user1_score, 
      p2_score: result.user2_score,
    });
  }

  getJoinedGame(g: GameEngine[], player: Socket) {
    let game: GameEngine = undefined;
    g.forEach(room => { if (player.rooms.has(room.getID())) { game = room; }})
    return game;
  }

  getPublicRooms(g: GameEngine[], socket) {
    let list = [];
    g.forEach(room => {
      let spec = [];
      room.getSpec().forEach(sp => {
        spec.push(this.getUserInfo(socket.data.user_id, sp))
      })
      list.push({
        id: room.getID(),
        name: room.getName(), 
        access_modifier: room.getAccess(),
        player_list: [
          this.getUserInfo(socket.data.user_id, room.getPlayer1()),
          this.getUserInfo(socket.data.user_id, room.getPlayer2()),
        ],
        spectator_list: spec, 
      })
    })
    return list;
  }

  async getUserInfo(user, user_id) {
    const foundUser = await this.userRepository.findOneBy({ id: user_id });
    const foundUserStats = await this.userStatsRepository.findOneBy({ user_id: user_id });
    const friend = await this.friendListRepository.findOneBy({ user_id: user, target_user_id: user_id });
    return ({
      intra_id: foundUser.intra_id,
      nickname: foundUser.nickname,
      profile_url: foundUser.profile_url,
      ladder_score: foundUserStats.ladder_score,
      is_friend: (friend) ? true : false
    });
  }
}
