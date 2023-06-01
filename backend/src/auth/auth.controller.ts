import express from 'express';
import debug from 'debug';

const log: debug.IDebugger = debug('Auth Controller');


class AuthController {
    async setCookie(req: express.Request, res: express.Response, next: express.NextFunction) {
        console.log('next');
        req.session._id = res.locals._id;
        console.log('test');
        return res.status(200).send(JSON.stringify(res.locals));
    }
}

export default new AuthController();