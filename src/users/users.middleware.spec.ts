import UsersService from './users.service';
import { NextFunction, Request, Response } from 'express';
import UsersMiddleware from './users.middleware';
import { SessionData, Session } from 'express-session';
jest.mock('./users.service');



const mockUser = {
    _id: 'bcc71266-98a7-4935-8b6f-37b04752183b',
    email: 'testUser@test.com',
    password: '$2b$10$YHBwiIAAgcxoqtYx1cl7r.pns6EEcwPuMoaYpw/P.ccFxXkIh7236',
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

describe('UsersMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: Partial<NextFunction>;

  

    beforeEach(() => {
        mockRequest = {
            session : {} as Session & Partial<SessionData>,
            body : {},
            params: {},
        };
        mockResponse = {
            locals : {},
        };
        mockNext = jest.fn();
    });

    describe('validateSameEmailDoesntExist', () => {
        it('calls the next without error', async () => {
            (UsersService.getUserByEmail as jest.Mock).mockResolvedValueOnce(null);

            await UsersMiddleware.validateSameEmailDoesntExist(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            
            const mockError = new Error('Email already in use');
            expect(mockNext).toBeCalledTimes(1);
            expect(mockNext).not.toBeCalledWith(mockError);
        });

        it('next func called with error if user with the email exist', async () => {
            (UsersService.getUserByEmail as jest.Mock).mockResolvedValueOnce(mockUser);

            await UsersMiddleware.validateSameEmailDoesntExist(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );

            const mockError = new Error('Email already in use');
            expect(mockNext).toBeCalledWith(mockError);
        });
    });

    describe('validateUserExists', () => {
        it('calls the next without error', async () => {
            (UsersService.getUserById as jest.Mock).mockResolvedValueOnce(mockUser);

            await UsersMiddleware.validateUserExists(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            
            const mockError = new Error('User does not exist');
            expect(mockNext).toBeCalledTimes(1);
            expect(mockNext).not.toBeCalledWith(mockError);
            expect(mockResponse.locals?.user).toStrictEqual(mockUser);
        });

        it('next func called with error if user does not exist', async () => {
            (UsersService.getUserById as jest.Mock).mockResolvedValueOnce(null);

            await UsersMiddleware.validateUserExists(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            const mockError = new Error('User does not exist');
            expect(mockNext).toBeCalledWith(mockError);
        });
    });

    describe('onlySameUserCanDoThisAction', () => {
        it('calls the next', async () => {
            mockRequest.session = {
                _id : mockUser._id
            } as Session & Partial<SessionData>;

            mockRequest.params = {
                userId : mockUser._id
            };

            await UsersMiddleware.onlySameUserCanDoThisAction(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );

            const mockError = new Error('Not authorized');
            expect(mockNext).toBeCalledTimes(1);
            expect(mockNext).not.toBeCalledWith(mockError);
        });

        it('next func called with error if ids are not same', async () => {
            mockRequest.session = {
                _id : mockUser._id
            } as Session & Partial<SessionData>;

            mockRequest.params = {
                userId : ''
            };
    
            await UsersMiddleware.onlySameUserCanDoThisAction(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            const mockError = new Error('Not authorized');
            expect(mockNext).toBeCalledWith(mockError);
        });
    });

});