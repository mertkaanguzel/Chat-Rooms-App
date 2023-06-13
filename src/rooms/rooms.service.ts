import UsersEntity from '../users/users.entity';
import RoomsEntity from './rooms.entity';
import { IRooms } from './rooms.entity' ;
class UsersService {
    UserModel = UsersEntity.User;
    RoomModel = RoomsEntity.Room;


    async createRoom(roomName: string, userId: string) {
        /*
        const room = new this.roomModel({
            name: roomName,
        });
        */
        const room = new this.RoomModel({
            name: roomName,
            createdBy: userId,
            users: [userId],
        });
        await room.save();
        /*
        await this.UserModel.findByIdAndUpdate(userId,
            { '$push': { 'rooms': room } },
            { 'new': true, 'upsert': true },
        )
            .exec();
       */  
        await this.pushRoomToUser(userId, room);
        return { id: room._id.toString() };
    }

    async addRoomToUser(roomId: string, userId: string) {
        //const room = await this.roomModel.findOne({ _id: roomId }).exec();
        const room = await this.RoomModel.findByIdAndUpdate(roomId,
            { '$push': { 'users': userId } },
            { 'new': true, 'upsert': true },
        )
            .exec();
        /*
        await this.UserModel.findByIdAndUpdate(userId,
            { '$push': { 'rooms': room } },
            { 'new': true, 'upsert': true },
        )
            .exec();
       */  
        await this.pushRoomToUser(userId, room);
    }

    async pushRoomToUser(userId: string, room: IRooms) {
        await this.UserModel.findByIdAndUpdate(userId,
            { '$push': { 'rooms': room } },
            { 'new': true, 'upsert': true },
        )
            .exec();
    }

    async deleteRoom(roomId: string) {
        //const room = await this.roomModel.findOne({ _id: roomId }).exec();
        const result = await this.RoomModel.deleteOne({ _id: roomId }).exec();
        if (Number(result.deletedCount) === 0) throw new Error('Room could not be deleted');
        await this.UserModel.updateMany(
            {
                'rooms._id' : { $in : [roomId] },
            },
            { $pull: { rooms: { _id: { $in : [roomId] } } } },
        );

    }

    async getRoom(roomId: string) {
        const room = await this.RoomModel.findOne({ _id: roomId }).exec();
        if (!room) throw new Error('Room does not exist');
        return {
            _id : room?._id,
            name : room?.name,
            createdBy : room?.createdBy,
        };

    }
}

export default new UsersService();