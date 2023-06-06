import UsersEntity from './users.entity';
import RoomsEntity from '../rooms/rooms.entity';
import { CreateUserDto } from './create.user.dto';
//import shortid from 'shortid';


class UsersService {
    userModel = UsersEntity.User;
    roomModel = RoomsEntity.Room;
    async createUser (userFields: CreateUserDto): Promise<any> {
        const user = new this.userModel({
            //_id: shortid.generate(),
            ...userFields,
        });
        await user.save();
    }

    async getUserByEmail(email: string): Promise<any> {
        return this.userModel.findOne({ email }).exec();
    }

    async getUserById(userId: string) {
        return this.userModel.findOne({ _id: userId }).exec();
    }

    async getUserByEmailWithPassword(email: string) {
        return this.userModel.findOne({ email })
            .select('_id email +password')
            //.select('_id email permissionFlags +password')
            .exec();
    }

    async updateUserNewRoom(roomName: string, userId: string) {
        //const user =  await this.userModel.findOne({ _id: userId }).exec();
        const room = new this.roomModel({
            name: roomName,
        });
        await room.save();
        /*
        user?.rooms.push(room);
        await user?.save();
        */
        
        await this.userModel.findByIdAndUpdate(userId,
            { '$push': { 'rooms': room } },
            { 'new': true, 'upsert': true },
        )
            .exec();
            
        return { id: room._id };
    }

    async updateUserRoom(roomId: string, userId: string) {
        const room = await this.roomModel.findOne({ _id: roomId }).exec();
        await this.userModel.findByIdAndUpdate(userId,
            { '$push': { 'rooms': room } },
            { 'new': true, 'upsert': true },
        )
            .exec();
            
    }

    async getUserRooms(userId: string) {
        const user =  await this.userModel.findOne({ _id: userId }).exec();
        const rooms = user?.rooms.map(room => {
            return {
                _id: room._id.toString(),
                name: room.name,
            };
        });
        return rooms;
    }
}

export default new UsersService();