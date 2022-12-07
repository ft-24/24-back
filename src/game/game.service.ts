import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Socket } from 'socket.io';
import { FriendListEntity } from 'src/user/entity/friendList.entity';
import { MatchHistoryEntity } from 'src/user/entity/matchHistory.entity';
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
    @InjectRepository(GameResultEntity) private gameResultRepository: Repository<GameResultEntity>,
    @InjectRepository(MatchHistoryEntity) private matchHistoryRepository: Repository<MatchHistoryEntity>
  ) {}

  private logger = new Logger(GameService.name)

  async insertGameResult(result) {
    const insertedResult = await (await this.gameResultRepository.insert(result)).raw[0];
    const foundResult = await this.gameResultRepository.findOneBy({ id: insertedResult.id })

    await this.matchHistoryRepository.insert({
      user_id: foundResult.user1_id,
      opponent_id: foundResult.user2_id,
      user_score: foundResult.user1_score,
      opponent_score: foundResult.user2_score,
      mode: 'public',
      playedAt: new Date(),
    })
    await this.matchHistoryRepository.insert({
      user_id: foundResult.user2_id,
      opponent_id: foundResult.user1_id,
      user_score: foundResult.user2_score,
      opponent_score: foundResult.user1_score,
      mode: 'public',
      playedAt: new Date(),
    })
    const user1 = await this.userRepository.findOneBy({ id: foundResult.user1_id });
    const user2 = await this.userRepository.findOneBy({ id: foundResult.user2_id });
    return ({
      p1: user1.nickname,
      p2: user2.nickname,
      win: result.win,
      p1_score: result.user1_score, 
      p2_score: result.user2_score,
    });
  }

  getGameById(g: GameEngine[], id: string) {
    let game: GameEngine = undefined;
    g.forEach(room => { if (room.getID() == id) { game = room; }})
    return game;
  }

  getJoinedGame(g: GameEngine[], player: Socket) {
    let game: GameEngine = undefined;
    for (const room of g) {
      if (player.rooms.has(room.getID())) {
        game = room;
      }
    }
    return game;
  }

  async getInfoByGame(g: GameEngine, socket) {
    let player = [];
    let spec = [];

    g.getSpec().forEach(async sp => {
      spec.push(await this.getUserInfo(socket.data.user_id, sp))
    })
    if (g.getPlayer1()) {
      player.push(await this.getUserInfo(socket.data.user_id, g.getPlayer1()));
    }
    if (g.getPlayer2()) {
      player.push(await this.getUserInfo(socket.data.user_id, g.getPlayer2()));
    }
    return ({
      id: g.getID(),
      name: g.getName(), 
      access_modifier: g.getAccess(),
      player_list: player,
      spectator_list: spec, 
      ready: g.getReady(),
    })
  }

  async getPublicRooms(g: GameEngine[], socket) {
    let list = [];
    for (const room of g) {
      list.push(await this.getInfoByGame(room, socket))
    }
    return await list;
  }

  matchMaking(g: GameEngine[]): GameEngine {
    g.forEach(room => {
      if (!room.getPlayer2()) {
        return room;
      }
    })
    return undefined;
  }

  async getUserInfo(user: number, user_id: number) {
    const foundUser = await this.userRepository.findOneBy({ id: user_id });
    const foundUserStats = await this.userStatsRepository.findOneBy({ user_id: user_id });
    const friend = await this.friendListRepository.findOneBy({ user_id: user, target_user_id: user_id });
    const ret = {
      intra_id: foundUser.intra_id,
      nickname: foundUser.nickname,
      profile_url: foundUser.profile_url,
      ladder_score: foundUserStats.ladder_score,
      is_my_friend: (friend) ? true : false
    }
    return (ret);
  }
}
