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
        
        this.app.post('/auth', [
            body('email').isEmail(),
            body('password').isString(),
            BodyvalidationMiddleware.verifyBodyFieldsErrors,
            AuthMiddleware.verifyUserPassword,
            AuthController.setCookie,
        ]);
        
        return this.app;
    }
}