import UsersService from './users.service';
import UsersEntity from './users.entity';

jest.mock('./users.entity');

const mockUser = {
    _id: 'bcc71266-98a7-4935-8b6f-37b04752183b',
    email: 'testUser@test.com',
    rooms: [
        {
            _id: '3fc80e7f-ce94-4f3e-9216-ab09a3ebf318',
            name: 'testRoom',
            createdBy: 'bcc71266-98a7-4935-8b6f-37b04752183b',
            users: [],
            __v: 0,
        },
    ],
    __v: 0,
};

describe('UsersService', () => {
    const userModel = UsersEntity.User;

    describe('getRoomsOfUser', () => {
        it('returns the expected result', async () => {
            (userModel.findOne as jest.Mock).mockImplementationOnce(() => { 
                return { exec: jest.fn().mockResolvedValueOnce(mockUser) };
            });
            const expectedResult = [
                {
                    name: 'testRoom',
                    _id: '3fc80e7f-ce94-4f3e-9216-ab09a3ebf318',

                },
            ];
            const result = await UsersService.getRoomsOfUser('');
            expect(result).toStrictEqual(expectedResult);
            //entitydeki mongo cagrisinda dolayi bitmio test
        });
    });

    describe('getUserById', () => {
        it('throws exception when user does not exist', async () => {
            (userModel.findOne as jest.Mock).mockImplementationOnce(() => { 
                return { exec: jest.fn().mockResolvedValueOnce(undefined) };
            });
            expect(UsersService.getUserById('')).rejects.toThrowError('User does not exist');
        });
    });

});