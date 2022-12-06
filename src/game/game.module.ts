import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendListEntity } from 'src/user/entity/friendList.entity';
import { UserEntity } from 'src/user/entity/user.entity';
import { UserStatsEntity } from 'src/user/entity/userStats.entity';
import { GameResultEntity } from './entities/gameResult.entity';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserStatsEntity, FriendListEntity, GameResultEntity])
  ],
  controllers: [],
  providers: [GameGateway, GameService],
})
export class GameModule {}
