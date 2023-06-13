import debug from 'debug';
import MongooseService from '../common/initdb';
import { randomUUID } from 'crypto';
import roomsEntity from '../rooms/rooms.entity';
import { IRooms } from '../rooms/rooms.entity' ;

const log: debug.IDebugger = debug('Users Entity');

export interface IUser {
    _id: typeof randomUUID,
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    rooms?: IRooms[];
  }

class UsersEntity {
    Schema = MongooseService.getMongoose().Schema;

    userSchema = new this.Schema<IUser>({
        _id: {
            type: 'UUID',
            default: () => randomUUID(),
        },
        email: { type: String, required: true },//String,
        password: { type: String, select: false, required: true },
        firstName: String,
        lastName: String,
        rooms: [roomsEntity.roomSchema],
        //permissionFlags: Number,
    }, { id: false });

    User = MongooseService.getMongoose().model('Users', this.userSchema);

    constructor() {
        log('Created new instance of UsersDao');
    }
}

export default new UsersEntity();
