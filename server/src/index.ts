import express, { type Request, type Response } from 'express';
import { createServer } from 'http';
import path from 'node:path';
import debug from 'debug';
import cors from 'cors';
import { Server, type Socket } from 'socket.io';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import session from 'express-session';

import * as winston from 'winston';
import * as expressWinston from 'express-winston';

import MongooseService from './common/initdb';
import { CommonRoutes } from './common/common.routes';
import { AuthRoutes } from './auth/auth.routes';
import { UsersRoutes } from './users/users.routes';
import { RoomsRoutes } from './rooms/rooms.routes';
import { errorHandler } from './common/http-error';
import { stubAuthRouter } from './app';

declare module 'express-session' {
    interface SessionData {
        _id: string;
    }
}

const debugLog: debug.IDebugger = debug('app');
const port = Number(process.env.PORT) || 3000;

const clientRoot = path.resolve(__dirname, '..', '..', 'client');
const clientDist = path.resolve(clientRoot, 'dist');

export const app: express.Application = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
});

const routes: Array<CommonRoutes> = [];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: true }));

const loggerOpts: expressWinston.LoggerOptions = {
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
        winston.format.json(),
        winston.format.prettyPrint(),
        winston.format.colorize({ all: true }),
    ),
};

if (String(process.env.STAGE) !== 'DEV') {
    loggerOpts.meta = false;
}

app.use(expressWinston.logger(loggerOpts));

app.set('trust proxy', (ip: string) => {
    return ip === '127.0.0.1' || ip === '123.123.123.123';
});

// Session middleware must precede the (legacy) routes that read req.session.
if (process.env.CACHE_URL) {
    const redisClient = createClient({ url: String(process.env.CACHE_URL) });
    redisClient.connect().catch((err) => {
        console.error('Redis connection failed:', err);
    });
    app.use(
        session({
            store: new RedisStore({ client: redisClient }),
            saveUninitialized: true,
            secret: String(process.env.SESSION_SECRET ?? 'dev-secret'),
            resave: false,
            name: 'sessionId',
            cookie: {
                secure: false,
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 1000 * 60 * 30,
            },
        }),
    );
} else {
    app.use(
        session({
            saveUninitialized: true,
            secret: String(process.env.SESSION_SECRET ?? 'dev-secret'),
            resave: false,
            name: 'sessionId',
            cookie: {
                secure: false,
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 1000 * 60 * 30,
            },
        }),
    );
}

routes.push(new AuthRoutes(app));
routes.push(new UsersRoutes(app));
routes.push(new RoomsRoutes(app));

io.on('connection', (socket: Socket) => {
    console.log('user connected');

    socket.on('new-user', (chatroomId: string, userId: string, socketId: string) => {
        console.log('new-user', socketId);
        socket.join(chatroomId);
        socket.broadcast.to(chatroomId).emit('user-connected', chatroomId, userId, socketId);
    });

    socket.on('send-chat-message', (chatroomId: string, message: unknown) => {
        socket.broadcast.to(chatroomId).emit('chat-message', chatroomId, message);
    });

    socket.on('disconnecting', () => {
        for (const chatroomId of socket.rooms.keys()) {
            console.log('1', chatroomId);
            socket.broadcast.to(chatroomId).emit('user-disconnected', chatroomId, socket.id);
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        console.log('LIST OF ROOMS:', socket.id);
    });
});

io.of('/').adapter.on('create-room', (room: string) => {
    console.log(`room ${room} was created`);
});
io.of('/').adapter.on('join-room', (room: string, id: string) => {
    console.log(`socket ${id} has joined room ${room}`);
});

function start(): Promise<void> {
    MongooseService.connectWithRetry();

    // T1 tooling-spine stub: POST /auth/login wire-contract shape (replaced in T2).
    app.use(stubAuthRouter);

    // Single-origin front-end: Vite dev middleware in dev, built assets in prod.
    // Both served from the same Express origin (localhost:3000) as the API.
    if (process.env.NODE_ENV !== 'production') {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
            root: clientRoot,
        });
        app.use(vite.middlewares as unknown as express.RequestHandler);
    } else {
        app.use(express.static(clientDist));
        app.get('*', (_req: Request, res: Response) => {
            res.sendFile(path.join(clientDist, 'index.html'));
        });
    }

    app.use(errorHandler);

    httpServer.listen(port, () => {
        routes.forEach((route: CommonRoutes) => {
            debugLog(`Routes configured for ${route.getName()}`);
        });
        console.log(`Server running at http://localhost:${port}`);
    });
}

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});