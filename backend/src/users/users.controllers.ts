import express from 'express';
import usersService from './users.service';
import bcrypt from 'bcrypt';
import debug from 'debug';

const log: debug.IDebugger = debug('Users Controller');

class UsersController {


    async getUserById(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const user = await usersService.getUserById(req.body.id);
            res.status(200).send(user);
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
    }

    async createUser(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            req.body.password = await bcrypt.hash(req.body.password, 10);
            await usersService.createUser(req.body);
            res.sendStatus(204);
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
    }
}

export default new UsersController();