import debug from 'debug';
import express from 'express';
import UsersService from './users.service';

const log: debug.IDebugger = debug('Users Middleware');

class UsersMiddleware {
    async validateSameEmailDoesntExist(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) {
        try {
            const user = await UsersService.getUserByEmail(req.body.email);
            if (user) throw new Error('Email already in use');
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
        return next();
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
            
        } catch (error: any) {
            error.status = 404;
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
        } catch (error: any) {
            error.status = 403;
            next(error);
        }
    }
}

export default new UsersMiddleware();