import express from 'express';
import debug from 'debug';

const log: debug.IDebugger = debug('Auth Controller');


class AuthController {
    async setCookie(req: express.Request, res: express.Response, next: express.NextFunction) {
        req.session.user = res.locals;
        res.sendStatus(204);
    }
}

export default new AuthController();