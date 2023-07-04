import UsersService from '../users/users.service';
import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import AuthMiddleware from './auth.middleware';
jest.mock('../users/users.service');
jest.mock('bcrypt');


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

describe('AuthMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: Partial<NextFunction>;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            json: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe('verifyUserPassword', () => {
        it('calls the next', async () => {
            mockRequest.body = {
                email: mockUser.email,
                password: mockUser.password,
            };
            //mockResponse.locals = mockUser;
            (UsersService.getUserByEmailWithPassword as jest.Mock).mockResolvedValueOnce(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

            await AuthMiddleware.verifyUserPassword(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            
            expect(mockNext).toBeCalledTimes(1);
            expect(mockResponse.locals?._id).toBe(mockUser._id);
        });

        it('next func called with error if user not found', async () => {
            mockRequest.body = {
                email: mockUser.email,
                password: mockUser.password,
            };
            //mockResponse.locals = mockUser;
            (UsersService.getUserByEmailWithPassword as jest.Mock).mockResolvedValueOnce(null);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
            await AuthMiddleware.verifyUserPassword(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            const mockError = new Error('Invalid credentials.');
            expect(mockNext).toBeCalledWith(mockError);
        });

        it('next func called with error if passwords not match', async () => {
            mockRequest.body = {
                email: mockUser.email,
                password: mockUser.password,
            };
            //mockResponse.locals = mockUser;
            (UsersService.getUserByEmailWithPassword as jest.Mock).mockResolvedValueOnce(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
            await AuthMiddleware.verifyUserPassword(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            const mockError = new Error('Invalid credentials.');
            expect(mockNext).toBeCalledWith(mockError);
        });
    });

    describe('validCookieNeeded', () => {
        /*
        it('calls the next', async () => {
            mockRequest.session?._id = mockUser._id;
            await AuthMiddleware.validCookieNeeded(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            
            expect(mockNext).toBeCalledTimes(1);
            expect(mockRequest.session?._id).toBe(mockUser._id);
        });
        */
        it('next func called with error if session id not found', async () => {
    
            await AuthMiddleware.validCookieNeeded(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction,
            );
            const mockError = new Error('Not authenticated');
            expect(mockNext).toBeCalledWith(mockError);
        });
    });  
});