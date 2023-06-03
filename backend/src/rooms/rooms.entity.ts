import debug from 'debug';
import MongooseService from '../common/initdb';
import { randomUUID } from 'crypto';


const log: debug.IDebugger = debug('Users Entity');

class RoomsEntity {
    Schema = MongooseService.getMongoose().Schema;

    roomSchema = new this.Schema({
        _id: {
            type: 'UUID',
            default: () => randomUUID(),
        },
        name: String,
    }, { id: false });

    Room = MongooseService.getMongoose().model('Rooms', this.roomSchema);

    constructor() {
        log('Created new instance of RoomsDao');
    }
}

export default new RoomsEntity();
