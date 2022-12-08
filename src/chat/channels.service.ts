import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChatRoomEntity } from "./entity/chatRoom.entity";
import { ChatInfoEntity } from "./entity/chatInfo.entity";
import { UserEntity } from "src/user/entity/user.entity";
import * as bcrypt from 'bcrypt';

@Injectable()
export class ChannelService {
	constructor(
		@InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
		@InjectRepository(ChatRoomEntity) private chatRoomsRepository: Repository<ChatRoomEntity>,
		@InjectRepository(ChatInfoEntity) private chatInfoRepository: Repository<ChatInfoEntity>,
	) {}

	private logger = new Logger(ChannelService.name);

	async getAllChannels(user) {
		/* select id, owner_id, access_modifier, name from chat-rooms cr, RoomUserInfo rinfo
		   where cr.id  */
		const channels = ( await this.chatRoomsRepository.find() );
		const ret = []
		for (let ch in channels) {
			ret.push({
				room_id: channels[ch].id,
				name: channels[ch].name,
				access_modifier: channels[ch].access_modifier
			})
		}
		return ret;
	}

	async getParticipateChannels(user) {
		const rooms = (await this.chatInfoRepository.findBy({ user_id: user.user_id }));
		const ret = []
		for (const i of rooms) {
			let room = await this.chatRoomsRepository.findOneBy({ id: i.room_id });
			if (room) {
				ret.push({
					room_id: room.id,
					name: room.name,
					access_modifier: room.access_modifier
				});
			}
		}
		return ret;
	}

	async getParticipators(room) {
		const foundRoom = await this.chatRoomsRepository.findOneBy({ name: room })
		const ret = []
		if (foundRoom) {
			const rooms = await this.chatInfoRepository.findBy({ room_id: foundRoom.id });
			for (const i of rooms) {
				const user = await this.userRepository.findOneBy({ id: i.user_id });
				ret.push({
					intra_id: user.intra_id,
					nickname: user.nickname,
					profiles_url: user.profile_url,
					role: (foundRoom.owner_id == user.id) ? 'owner' : ((i.admin) ? 'admin' : 'user') 
				});
			}
		}
		return ret;
	}

	async passwordAuthorize(room, pass) {
		const foundRoom = await this.chatRoomsRepository.findOneBy({ name: room })
		if (!foundRoom) {
			return false;
		}
		if (pass) {
			this.logger.log('loggers!')
			if (await bcrypt.compare(pass, foundRoom.password)) {
				this.logger.log('loggersssss!')
				return true;
			}
			return true;
		} else {
			return false;
		}
	}
}