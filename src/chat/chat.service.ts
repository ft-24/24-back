import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from './entity/chat.entity';
import { ChatRoomEntity } from './entity/chatRoom.entity';
import * as bcrypt from 'bcrypt';
import { DmChannelEntity } from './entity/dmChannel.entity';
import { v4 as uuid } from 'uuid';
import { DMEntity } from './entity/dm.entity';
import { UserEntity } from 'src/user/entity/user.entity';
import { Socket } from 'socket.io';
import { ChatInfoEntity } from './entity/chatInfo.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(ChatRoomEntity)
    private chatRoomRepository: Repository<ChatRoomEntity>,
    @InjectRepository(ChatEntity)
    private chatRepository: Repository<ChatEntity>,
    @InjectRepository(DMEntity)
    private dmRepository: Repository<DMEntity>,
    @InjectRepository(DmChannelEntity)
    private dmChannelRepository: Repository<DmChannelEntity>,
    @InjectRepository(ChatInfoEntity)
    private chatInfoRepository: Repository<ChatInfoEntity>,
  ){}
  private logger = new Logger(ChatService.name);

  async createNewRoom(socket: Socket, room) {
    try {
      const foundRoom = await this.chatRoomRepository.findOneBy({ name: room.name });
      const foundOwner = await this.userRepository.findOneBy({ id: socket.data.user_id })
      if (!foundRoom) {
        let hash = "";
        if (room.password) {
          const salt = await bcrypt.genSalt();
          hash = await bcrypt.hash(room.password, salt);
          this.logger.log(`Generated pass : [${hash}] by [${room.password}]`)
        }
        const insertedRoom = await this.chatRoomRepository.insert({
          owner_id: foundOwner.id,
          name: room.name,
          access_modifier: room.access_modifier,
          password: hash,
          create_date: new Date(),
          update_date: new Date(),
        });
        return ``;
      }
      return `Room named ${room.name} is already exists!`;
    } catch(e) {

    }
  }

  async saveUser(user_id) {
    const foundUser = await this.dmChannelRepository.findOneBy({ user_id: user_id })
    if (!foundUser) {
      const newUser = {
        room: `${uuid()}`,
        user_id: user_id,
      }
      const insertedUser = await this.dmChannelRepository.insert(newUser);
      return insertedUser.raw[0];
    }
    return foundUser
  }

  async findUser(id) {
    const foundUser = await this.dmChannelRepository.findOneBy({ id: id });
    if (foundUser) {
      return foundUser;
    }
  }

  async userOnline(user) {
    await this.userRepository.update({ id: user }, { online: true })
  }

  async userOffline(user) {
    await this.userRepository.update({ id: user }, { online: false })
  }

  async saveDM(socket, msg) {
    this.logger.log(`user_id is: ${socket.data.user_id}`)
    const sender = await this.userRepository.findOneBy({ id: socket.data.user_id })
    const receiver = await this.userRepository.findOneBy({ nickname: msg.receiver })
    if (sender && receiver) {
      const insertedDM = await this.dmRepository.insert({
        sender: sender.id,
        receiver: receiver.id,
        chat: msg.msg,
        time: new Date(),
      });
    }
    return ({
      intra_id: sender.intra_id,
      profile_url: sender.profile_url,
      nickname: sender.nickname,
      chat: msg.msg,
      time: (new Date()).toString(),
    });
  }

  async saveChat(socket, msg) {
    const sender = await this.userRepository.findOneBy({ id: socket.data.user_id });
    const room = await this.chatRoomRepository.findOneBy({ name: msg.receiver })
    if (room && sender) {
      const insertedChat = await this.chatRepository.insert({
        room_id: room.id,
        sender: sender.id,
        chat: msg.msg,
        time: new Date(),
      });
    }
    return ({
      intra_id: sender.intra_id,
      profile_url: sender.profile_url,
      nickname: sender.nickname,
      chat: msg.msg,
      time: (new Date()).toString(),
    })
  }

  async getChat(room) {
    const foundRoom = await this.chatRoomRepository.findOneBy({ name: room })
    const foundChats = await this.chatRepository.findBy({ room_id: foundRoom.id })
    let chats = [];
    for (const c of foundChats) {
      const foundSender = await this.userRepository.findOneBy({ id: c.sender })
      chats.push({
        intra_id: foundSender.intra_id,
        profile_url: foundSender.profile_url,
        nickname: foundSender.nickname,
        chat: c.chat,
        time: (c.time).toString(),
      })
    }
    return chats;
  }

  async joinChat(user, room) {
    const foundUser = await this.userRepository.findOneBy({ id: user })
    const foundRoom = await this.chatRoomRepository.findOneBy({ name: room })
    const foundInfo = await this.chatInfoRepository.findOneBy({ user_id: foundUser.id, room_id: foundRoom.id })
    if (foundUser && foundRoom && !foundInfo) {
      await this.chatInfoRepository.insert({
        user_id: foundUser.id,
        room_id: foundRoom.id,
      })
    }
  }

  async findRoom(nickname) {
    const userId = (await this.userRepository.findOneBy({ nickname: nickname })).id;
    return (await this.dmChannelRepository.findOneBy({ user_id: userId })).room;
  }

  async getUserBySocket(socket: Socket) {
    if (socket.data.intra_id) {
      const foundUser = await this.userRepository.findOneBy({ id: socket.data.intra_id });
      if (foundUser) {
        return foundUser
      }
    }
    return undefined;
  }
}
