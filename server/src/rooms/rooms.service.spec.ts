import RoomsService from './rooms.service';
import RoomsEntity from './rooms.entity';

jest.mock('./rooms.entity');

const mockRoom = {
    _id: '3fc80e7f-ce94-4f3e-9216-ab09a3ebf318',
    name: 'testRoom',
    createdBy: 'bcc71266-98a7-4935-8b6f-37b04752183b',
    users: [],
    __v: 0,
};

describe('UsersService', () => {
    const RoomModel = RoomsEntity.Room;

    describe('getRoom', () => {
        it('returns the expected result', async () => {
            (RoomModel.findOne as jest.Mock).mockImplementationOnce(() => { 
                return { exec: jest.fn().mockResolvedValueOnce(mockRoom) };
            });
            const expectedResult = {
                _id: '3fc80e7f-ce94-4f3e-9216-ab09a3ebf318',
                name: 'testRoom',
                createdBy: 'bcc71266-98a7-4935-8b6f-37b04752183b',
            };
            const result = await RoomsService.getRoom('');
            expect(result).toStrictEqual(expectedResult);
            //entitydeki mongo cagrisinda dolayi bitmio test
        });

        it('throws exception when room does not exist', async () => {
            (RoomModel.findOne as jest.Mock).mockImplementationOnce(() => { 
                return { exec: jest.fn().mockResolvedValueOnce(undefined) };
            });
            expect(RoomsService.getRoom('')).rejects.toThrowError('Room does not exist');
        });
    });

    describe('deleteRoom', () => {
        it('throws exception when room can not be deleted', async () => {
            (RoomModel.deleteOne as jest.Mock).mockImplementationOnce(() => { 
                return { exec: jest.fn().mockResolvedValueOnce({ deletedCount : 0 }) };
            });
            expect(RoomsService.deleteRoom('')).rejects.toThrowError('Room could not be deleted');
        });
    });
});