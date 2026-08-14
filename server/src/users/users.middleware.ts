import express from 'express';
import UsersService from './users.service';
import { withStatus } from '../common/http-error';

class UsersMiddleware {
    async validateSameEmailDoesntExist(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) {
        try {
            const user = await UsersService.getUserByEmail(req.body.email);
            if (user) throw new Error('Email already in use');
            return next();
        } catch (error) {
            withStatus(error, 400);
            next(error);
        }
    }

    async validateUserExists(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {

        try {
            const user = await UsersService.getUserById(req.params.userId);
            if (!user) throw new Error('User does not exist');
            res.locals.user = user;
            return next();

        } catch (error) {
            withStatus(error, 404);
            next(error);
        }
    }


    async onlySameUserCanDoThisAction(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {

        try {
            if (req.params.userId !== req.session._id) {
                throw new Error('Not authorized');
            }
            return next();
        } catch (error) {
            withStatus(error, 403);
            next(error);
        }
    }
}

export default new UsersMiddleware();