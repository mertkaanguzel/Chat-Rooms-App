import UsersEntity from './users.entity';
import { CreateUserDto } from './create.user.dto';
import shortid from 'shortid';


class UsersService {
    userModel = UsersEntity.User;
    async createUser (userFields: CreateUserDto): Promise<any> {
        const user = new this.userModel({
            _id: shortid.generate(),
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

}

export default new UsersService();