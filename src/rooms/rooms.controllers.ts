import express from 'express';
import UsersService from '../users/users.service';
import bcrypt from 'bcrypt';
import debug from 'debug';
//import { io } from '../index';
import { UUID } from 'crypto';
const log: debug.IDebugger = debug('Users Controller');

class RoomsController {

    async addRoom(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const roomName = req.body.room;
            const userId = req.params.userId;
            const result = await UsersService.updateUserNewRoom(roomName, userId);
            // Send message that new room was created
            //io.emit('room-created', roomName);
            return res.status(200).send(JSON.stringify(result));
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
    }

    async addUserToRoom(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const roomId = req.body.roomId;
            const userId = req.params.userId;
            await UsersService.updateUserRoom(roomId, userId);
            return res.sendStatus(204);
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
    }

    async deleteRoom(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const roomId = req.body.roomId;
            //const userId = req.params.userId;
            await UsersService.deleteUserRoom(roomId);
            return res.sendStatus(204);
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
    }

    async getRooms(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const userId = req.params.userId;
            const result = await UsersService.getUserRooms(userId);
            return res.status(200).send(JSON.stringify(result));
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
    }
}

export default new RoomsController();