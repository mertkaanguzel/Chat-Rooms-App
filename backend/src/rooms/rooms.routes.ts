import express from 'express';
import { CommonRoutes } from '../common/common.routes';
import { body, query } from 'express-validator';
import BodyvalidationMiddleware from '../common/bodyvalidation.middleware';
import UsersMiddleware from '../users/users.middleware';
//import UsersControllers from './users.controllers';
import AuthMiddleware from '../auth/auth.middleware';
import RoomsControllers from './rooms.controllers';
import RoomsMiddleware from './rooms.middleware';

export class RoomsRoutes extends CommonRoutes {
    constructor(app: express.Application) {
        super(app, 'RoomsRoutes');  
    }

    configureRoutes(): express.Application {
        this.app.route('/rooms/:userId')
            .get(
                UsersMiddleware.validateUserExists,
                AuthMiddleware.validCookieNeeded,
                UsersMiddleware.onlySameUserCanDoThisAction,
                RoomsControllers.getRooms
            );
        
        this.app.route('/rooms/:userId')
            .post(
                body('room').notEmpty().withMessage('room name missing').isString(),
                BodyvalidationMiddleware.verifyBodyFieldsErrors,
                UsersMiddleware.validateUserExists,
                AuthMiddleware.validCookieNeeded,
                UsersMiddleware.onlySameUserCanDoThisAction,
                RoomsControllers.addRoom
            );

        this.app.route('/rooms/:userId')
            .put(
                body('roomId').notEmpty().withMessage('roomId missing').isString(),
                BodyvalidationMiddleware.verifyBodyFieldsErrors,
                UsersMiddleware.validateUserExists,
                RoomsMiddleware.validateRoomExists,
                AuthMiddleware.validCookieNeeded,
                RoomsMiddleware.onlyRoomAdminCanDoThisAction,
                RoomsControllers.addUserToRoom
            );

        this.app.route('/rooms')
            .delete(
                body('roomId').notEmpty().withMessage('roomId missing').isString(),
                BodyvalidationMiddleware.verifyBodyFieldsErrors,
                //UsersMiddleware.validateUserExists,
                RoomsMiddleware.validateRoomExists,
                AuthMiddleware.validCookieNeeded,
                RoomsMiddleware.onlyRoomAdminCanDoThisAction,
                RoomsControllers.deleteRoom
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