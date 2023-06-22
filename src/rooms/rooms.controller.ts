import express from 'express';
import UsersService from '../users/users.service';
import RoomsService from './rooms.service';
import bcrypt from 'bcrypt';
import debug from 'debug';
//import { io } from '../index';
import { UUID } from 'crypto';
const log: debug.IDebugger = debug('Users Controller');

class RoomsController {

    async createRoom(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const roomName = req.body.room;
            const userId = req.params.userId;
            const result = await RoomsService.createRoom(roomName, userId);
            // Send message that new room was created
            //io.emit('room-created', roomName);
            return res.status(200).send(JSON.stringify(result));
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
    }

    async addRoomToUser(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const roomId = req.body.roomId;
            const userId = req.params.userId;
            await RoomsService.addRoomToUser(roomId, userId);
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
            await RoomsService.deleteRoom(roomId);
            return res.sendStatus(204);
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
    }

    async getRooms(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const userId = req.params.userId;
            const result = await UsersService.getRoomsOfUser(userId);
            return res.status(200).send(JSON.stringify(result));
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
    }
}

export default new RoomsController();