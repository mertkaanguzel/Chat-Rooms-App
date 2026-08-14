import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import { errorHandler } from './common/http-error';

export const stubAuthRouter = express.Router();

stubAuthRouter.post('/auth/login', (_req: Request, res: Response) => {
    res.json({
        sessionId: 'stub-session-id',
        envelope: {
            salt: 'stub-salt',
            ciphertext: 'stub-ciphertext',
            nonce: 'stub-nonce',
        },
    });
});

export function createApp(): Application {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors({ credentials: true, origin: true }));
    app.use(stubAuthRouter);
    app.use(errorHandler);
    return app;
}