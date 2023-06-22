import UsersEntity from './users.entity';
import RoomsEntity from '../rooms/rooms.entity';
import { CreateUserDto } from './create.user.dto';
//import shortid from 'shortid';


class UsersService {
    userModel = UsersEntity.User;
    roomModel = RoomsEntity.Room;
    
    async createUser (userFields: CreateUserDto) {
        const user = new this.userModel({
            //_id: shortid.generate(),
            ...userFields,
        });
        await user.save();
    }

    async getUserByEmail(email: string) {
        return this.userModel.findOne({ email }).exec();
    }

    async getUserById(userId: string) {
        const user =  await this.userModel.findOne({ _id: userId }).exec();
        if (!user) throw new Error('User does not exist'); 
        return user;

    }

    async getUserByEmailWithPassword(email: string) {
        return this.userModel.findOne({ email })
            .select('_id email +password')
            //.select('_id email permissionFlags +password')
            .exec();
    }

    async getRoomsOfUser(userId: string) {
        const user =  await this.userModel.findOne({ _id: userId }).exec();
        const rooms = user?.rooms?.map(room => {
            return {
                _id: room._id.toString(),
                name: room.name,
            };
        });
        return rooms;
    }
}

export default new UsersService();