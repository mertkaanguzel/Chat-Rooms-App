import debug from 'debug';
import MongooseService from '../common/initdb';
import { randomUUID } from 'crypto';

const log: debug.IDebugger = debug('Users Entity');

export interface IRooms {
    _id: typeof randomUUID;
    name: string;
    createdBy: typeof randomUUID;
    users?: typeof randomUUID[];
  }

class RoomsEntity {
    Schema = MongooseService.getMongoose().Schema;

    roomSchema = new this.Schema<IRooms>({
        _id: {
            type: 'UUID',
            default: () => randomUUID(),
        },
        name: { type: String, required: true },//String,
        createdBy: {
            type: 'UUID',
            ref: 'User',
            required: true,
        },
        users: [
            {
                type: 'UUID',
                ref: 'User',
                required: true,
            },
        ],
    }, { id: false });
    /*
    middleware = this.roomSchema.post('deleteOne', async (room, next) => {
        console.log('test');
        console.log('test1');
        const userModel = UsersEntity.User;
        
        const result = await userModel.updateMany(
            {
                'rooms._id' : { $in : [room._id] },
            },
            { $pull: { rooms : { _id: room._id} } },
            { new: true },
        );

        const result = await userModel.updateMany(
            { rooms: { $elemMatch: { _id: room._id } } },
            { $pull: { rooms: { _id: room._id } } },
        );
        *
        const result = await userModel.updateMany(
            {
                'rooms._id' : { $in : [room._id] },
            },
            { $pull: { rooms: { _id: { $in : [room._id] } } } },
        );
        
        const result = await userModel.updateOne(
            {
                _id : '22231be6-f724-48d9-8887-3c09ee267f7d',
            },
            { $pull: { rooms: { _id: { $in : ['4a65a89f-a39c-494a-adfc-34586fb7e4bd'] } } } },
        );
        console.log(result);
        return next();
    });
*/
    Room = MongooseService.getMongoose().model('Rooms', this.roomSchema);

    constructor() {
        log('Created new instance of RoomsDao');
    }
}

export default new RoomsEntity();
