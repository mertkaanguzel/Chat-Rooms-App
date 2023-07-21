import express from 'express';
import { CommonRoutes } from '../common/common.routes';
import { body } from 'express-validator';
import BodyvalidationMiddleware from '../common/bodyvalidation.middleware';
import UsersMiddleware from './users.middleware';
import UsersControllers from './users.controller';
import AuthMiddleware from '../auth/auth.middleware';

export class UsersRoutes extends CommonRoutes {
    constructor(app: express.Application) {
        super(app, 'UsersRoutes');  
    }

    configureRoutes(): express.Application {
        this.app.route('/users')
            .post(
                body('email').notEmpty().withMessage('email missing').isEmail(),
                body('password')
                    .notEmpty()
                    .withMessage('password missing')
                    .isLength({ min: 5 })
                    .withMessage('Must include password (5+ chars)'),
                BodyvalidationMiddleware.verifyBodyFieldsErrors,
                UsersMiddleware.validateSameEmailDoesntExist,
                UsersControllers.createUser,
            );
        
        this.app
            .route('/users/:userId')
            .all(
                UsersMiddleware.validateUserExists,
                AuthMiddleware.validCookieNeeded,
                UsersMiddleware.onlySameUserCanDoThisAction
                //PermissionMiddleware.onlySameUserOrAdminCanDoThisAction
            )
            .get(UsersControllers.getUserById);
        
        this.app.route('/userId')
            .get(
                AuthMiddleware.validCookieNeeded,
                UsersControllers.getUserId,
            );

        return this.app;
    }
}