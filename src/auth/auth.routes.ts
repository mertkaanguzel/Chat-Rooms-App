import { body } from 'express-validator';
import { CommonRoutes } from '../common/common.routes';
import express from 'express';
import BodyvalidationMiddleware from '../common/bodyvalidation.middleware';
import AuthMiddleware from './auth.middleware';
import AuthController from './auth.controller';

export class AuthRoutes extends CommonRoutes {
    constructor(app: express.Application) {
        super(app, 'AuthRoutes');
    }

    configureRoutes(): express.Application {
    /*    
        this.app.post('/auth', [
            body('email').notEmpty().withMessage('email missing').isEmail(),
            body('password').notEmpty().withMessage('password missing').isString(),
            BodyvalidationMiddleware.verifyBodyFieldsErrors,
            AuthMiddleware.verifyUserPassword,
            AuthController.setCookie,
        ]);
*/
        this.app.route('/auth')
            .post(
                body('email').notEmpty().withMessage('email missing').isEmail(),
                body('password').notEmpty().withMessage('password missing'),
                BodyvalidationMiddleware.verifyBodyFieldsErrors,
                AuthMiddleware.verifyUserPassword,
                AuthController.setCookie,
            );
        
        return this.app;
    }
}