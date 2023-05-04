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
                    userId: user._id,
                    //email: user.email,
                    //permissionFlags: user.permissionFlags,
                };
                next();
            }
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
            if (!req.session || !req.session.user) {
                throw new Error('Not authenticated');
            }
            next();
        } catch (error: any) {
            error.status = 401;
            next(error);
        }
    }
}

export default new AuthMiddleware();