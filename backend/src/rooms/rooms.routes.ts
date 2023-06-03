import express from 'express';
import { CommonRoutes } from '../common/common.routes';
import { body } from 'express-validator';
import BodyvalidationMiddleware from '../common/bodyvalidation.middleware';
import UsersMiddleware from '../users/users.middleware';
//import UsersControllers from './users.controllers';
import AuthMiddleware from '../auth/auth.middleware';
import RoomsControllers from './rooms.controllers';

export class RoomsRoutes extends CommonRoutes {
    constructor(app: express.Application) {
        super(app, 'RoomsRoutes');  
    }

    configureRoutes(): express.Application {
        this.app.get('/room', (req, res) => {
            res.send('Hello World');
        });
        
        this.app.route('/users/:userId')
            .post(
                body('room').notEmpty().withMessage('room name missing').isString(),
                BodyvalidationMiddleware.verifyBodyFieldsErrors,
                UsersMiddleware.validateUserExists,
                AuthMiddleware.validCookieNeeded,
                UsersMiddleware.onlySameUserCanDoThisAction,
                RoomsControllers.addRoom
            );
        /*
        this.app
            .route('/users/:userId')
            .all(
                UsersMiddleware.validateUserExists,
                AuthMiddleware.validCookieNeeded,
                UsersMiddleware.onlySameUserCanDoThisAction
                //PermissionMiddleware.onlySameUserOrAdminCanDoThisAction
            )
            .get(UsersControllers.getUserById);
*/
        return this.app;
    }
}