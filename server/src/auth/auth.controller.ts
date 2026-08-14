import express from 'express';

class AuthController {
    async setCookie(req: express.Request, res: express.Response, _next: express.NextFunction) {
        req.session._id = res.locals._id;
        return res.status(200).send(JSON.stringify(res.locals));
    }
}

export default new AuthController();