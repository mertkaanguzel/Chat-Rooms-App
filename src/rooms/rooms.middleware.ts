import debug from 'debug';
import express from 'express';
import RoomsService from './rooms.service';

const log: debug.IDebugger = debug('Rooms Middleware');

class RoomsMiddleware {
    async onlyRoomAdminCanDoThisAction(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        
        try {
            const room = res.locals.room;//await RoomsService.getRoom(req.body.roomId);
            if (room.createdBy.toString() !== req.session._id) {
                throw new Error('Not authorized (only admin)');
            }
            return next();  
        } catch (error: any) {
            error.status = 403;
            next(error);
        }
    }

    async validateRoomExists(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
      
        try {
            const room = await RoomsService.getRoom(req.body.roomId);
            if (!room) throw new Error('Room does not exist'); 
            res.locals.room = room;
            return next();
          
        } catch (error: any) {
            error.status = 404;
            next(error);
        }
    }

}

export default new RoomsMiddleware();