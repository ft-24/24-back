import { Controller, Get, Head, Headers, Logger, Param, Res } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  private logger = new Logger(UserController.name)

  @Get()
  testing(){
    return 'hi';
  }

  @Get('me')
  async getUserInfo(@Headers() headers: any, @Res() res) {
    // this.logger.log(pa, pr);
    const ret = await this.userService.getUserInfo(headers);
    // this.logger.log(ret[pr])
    // const data = ret[pr];
    return res.status(200).send(ret);
  }

  @Get('friends')
  async getUserFriends(@Headers() headers: any, @Res() res) {
	return res.status(200).send(
		await this.userService.getUserFriends(headers)
	);
  }

  @Get('friends/profile/:friend_intra_id')
  async getFriendsProfile(@Headers() headers: any, @Res() res, @Param('friend_intra_id') friend) {
	const profile = await this.userService.getFriendsProfile(headers, friend);
	return res.stats(200).send(profile);
  }
}