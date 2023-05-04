import debug from 'debug';
import MongooseService from '../common/initdb';

const log: debug.IDebugger = debug('Users Entity');

class UsersEntity {
    Schema = MongooseService.getMongoose().Schema;

    userSchema = new this.Schema({
        _id: String,
        email: String,
        password: { type: String, select: false },
        firstName: String,
        lastName: String,
        //permissionFlags: Number,
    }, { id: false });

    User = MongooseService.getMongoose().model('Users', this.userSchema);

    constructor() {
        log('Created new instance of UsersDao');
    }
}

export default new UsersEntity();
