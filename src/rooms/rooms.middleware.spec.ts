import RoomsService from './rooms.service';
import { NextFunction, Request, Response } from 'express';
import RoomsMiddleware from './rooms.middleware';
import { SessionData, Session } from 'express-session';
jest.mock('./rooms.service');

const mockRoom = {
    _id: '3fc80e7f-ce94-4f3e-9216-ab09a3ebf318',
    name: 'testRoom',
    createdBy: 'bcc71266-98a7-4935-8b6f-37b04752183b',
    users: [],
    __v: 0,
};

describe('RoomsMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: Partial<NextFunction>;

    beforeEach(() => {
        mockRequest = {
            session : {} as Session & Partial<SessionData>,
            body : {},
        };
        mockResponse = {
            locals : {},
        };
        mockNext = jest.fn();
    });

    describe('calls the next without error', () => {
        it('calls the next', async () => {
            mockRequest.session = {
                _id: mockRoom.createdBy,
            } as Session & Partial<SessionData>;

            mockResponse.locals = {
                room : mockRoom,
            };

            await RoomsMiddleware.onlyRoomAdminCanDoThisAction(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );

            const mockError = new Error('Not authorized (only admin)');
            expect(mockNext).toBeCalledTimes(1);
            expect(mockNext).not.toBeCalledWith(mockError);
        });

        it('next func called with error if ids are not same', async () => {
            mockRequest.session = {
                _id: '',
            } as Session & Partial<SessionData>;

            mockResponse.locals = {
                room : mockRoom,
            };

            await RoomsMiddleware.onlyRoomAdminCanDoThisAction(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            const mockError = new Error('Not authorized (only admin)');
            expect(mockNext).toBeCalledWith(mockError);
        });
    });

    describe('validateRoomExists', () => {
        it('calls the next without error', async () => {
            mockRequest.body = {
                roomId: mockRoom._id,
            };

            (RoomsService.getRoom as jest.Mock).mockResolvedValueOnce(mockRoom);

            await RoomsMiddleware.validateRoomExists(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            
            const mockError = new Error('Room does not exist');
            expect(mockNext).toBeCalledTimes(1);
            expect(mockNext).not.toBeCalledWith(mockError);
            expect(mockResponse.locals?.room).toStrictEqual(mockRoom);
        });

        it('next func called with error if room does not exist', async () => {
            mockRequest.body = {
                roomId: mockRoom._id,
            };

            (RoomsService.getRoom as jest.Mock).mockResolvedValueOnce(null);

            await RoomsMiddleware.validateRoomExists(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            
            const mockError = new Error('Room does not exist');
            expect(mockNext).toBeCalledWith(mockError);
        });
    });
});