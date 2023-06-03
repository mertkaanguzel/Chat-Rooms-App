import express from 'express';
import UsersService from '../users/users.service';
import bcrypt from 'bcrypt';

class AuthMiddleware {

    async verifyUserPassword(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        try {
            const user: any = await UsersService.getUserByEmailWithPassword(
                req.body.email
            );
            if (user && await bcrypt.compare(req.body.password, user.password)) {
                res.locals = {
                    _id: user._id,
                    //email: user.email,
                    //permissionFlags: user.permissionFlags,
                };
                return next();
            }
            throw new Error('Invalid credentials.');
        } catch (error: any) {
            error.status = 401;
            next(error);
        }
    }

    async validCookieNeeded(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        try {
            if (!req.session || !req.session._id) {
                throw new Error('Not authenticated');
            }
            return next();
        } catch (error: any) {
            error.status = 401;
            next(error);
        }
    }
}

export default new AuthMiddleware();