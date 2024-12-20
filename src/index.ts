import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
/*
import dotenv from 'dotenv';
dotenv.config();
*/
import cors from 'cors';
import MongooseService from './common/initdb';

import * as winston from 'winston';
import * as expressWinston from 'express-winston';

import debug from 'debug';


import RedisStore from 'connect-redis';
import session from 'express-session';
declare module 'express-session' {
    interface SessionData {
        //user: { [key: string]: any };
        _id: string;
    }
  }
import { createClient } from 'redis';

import { CommonRoutes } from './common/common.routes';
import { AuthRoutes } from './auth/auth.routes';
import { UsersRoutes } from './users/users.routes';
import { RoomsRoutes } from './rooms/rooms.routes';
import path from 'path';
/*
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
    throw dotenvResult.error;
}
*/
export const app: express.Application = express();
//socket
const httpServer = createServer(app);
const io = require("socket.io")(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });
//socket
const port = 3000;
const routes: Array<CommonRoutes> = [];
const debugLog: debug.IDebugger = debug('app');

app.use(express.json());
app.use(express.urlencoded({extended : true}));
let corsOptions = {
    credentials: true,
    origin: true
 }
 
 app.use(cors(corsOptions))
//socket
app.use(express.static(path.join(__dirname, 'public')));
//socket
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

//app.set('trust proxy', 1);

// Initialize client.
const redisClient = createClient({
    url: String(process.env.CACHE_URL)
  });

redisClient.connect().catch(console.error);

// Initialize store.
const redisStore = new RedisStore({
    client: redisClient,
});

app.set('trust proxy', (ip) => {
    if (ip === '127.0.0.1' || ip === '123.123.123.123') return true // trusted IPs
    else return false
  })

// Initialize sesssion storage.
app.use(
    session({
        store: redisStore,
        saveUninitialized: true,
        secret: String(process.env.SESSION_SECRET),
        resave: false,
        name: 'sessionId',
        cookie: {
            secure: false,
            httpOnly: true,
            sameSite: 'none',
            maxAge: 1000 * 60 * 30,
        },
    })
);

routes.push(new AuthRoutes(app));
routes.push(new UsersRoutes(app));
//socket
routes.push(new RoomsRoutes(app));
//socket

const runningMsg = `Server running at http://localhost:${port}`;

app.get('/', (req: express.Request, res: express.Response) => {
    res.status(200).send(runningMsg);
});

function errorHandler(error: any, req: express.Request, res: express.Response, next: express.NextFunction) {
    debugLog( `error ${error.message}`); 
    const status = error.status || 500;
    res.status(status).send(JSON.stringify({
        error: error.message,
    }));
}

app.use(errorHandler);
/*
app.listen(port, () => {
    routes.forEach((route: CommonRoutes) => {
        debugLog(`Routes configured for ${route.getName()}`);
    });

    console.log(runningMsg);
});
*/
//socket
httpServer.listen(port, () => {
    MongooseService.connectWithRetry();
    routes.forEach((route: CommonRoutes) => {
        debugLog(`Routes configured for ${route.getName()}`);
    });

    console.log(runningMsg);
});
//socket

//socket
io.on('connection', (socket) => {
    console.log('user connected');

    socket.on('new-user', (chatroomId, userId, socketId) => {
        console.log('new-user');
        console.log('new-user', socketId);
        socket.join(chatroomId);
        //rooms[room].users[socket.id] = name
        //socket.to(chatroomId).local.emit('user-connected', userId);
        socket.broadcast.to(chatroomId).emit('user-connected', chatroomId, userId, socketId);
    });

    socket.on('send-chat-message', (chatroomId, message) => {
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
io.of('/').adapter.on('create-room', (room) => {
    console.log(`room ${room} was created`);
});
io.of('/').adapter.on('join-room', (room, id) => {
    console.log(`socket ${id} has joined room ${room}`);
});
//socket