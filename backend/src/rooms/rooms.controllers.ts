import express from 'express';
import UsersService from '../users/users.service';
import bcrypt from 'bcrypt';
import debug from 'debug';

const log: debug.IDebugger = debug('Users Controller');

class RoomsController {

    async addRoom(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const roomName = req.body.room;
            const userId = req.body._id;
            const result = await UsersService.updateUserRoom(roomName, userId);
            return res.status(200).send(JSON.stringify(result));
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
    }
}

export default new RoomsController();