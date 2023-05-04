import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';

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

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
    throw dotenvResult.error;
}

const app: express.Application = express();
const port = 3000;
const routes: Array<CommonRoutes> = [];
const debugLog: debug.IDebugger = debug('app');

app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(cors());

const loggerOpts: expressWinston.LoggerOptions = {
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
        winston.format.json(),
        winston.format.prettyPrint(),
        winston.format.colorize({ all: true }),
    ),
};

if (!process.env.DEBUG) {
    loggerOpts.meta = false;
}

app.use(expressWinston.logger(loggerOpts));

//app.set('trust proxy', 1);

// Initialize client.
const redisClient = createClient();

redisClient.connect().catch(console.error);

// Initialize store.
const redisStore = new RedisStore({
    client: redisClient,
});

// Initialize sesssion storage.
app.use(
    session({
        store: redisStore,
        saveUninitialized: false,
        secret: 'topSecret',
        resave: false,
        cookie: {
            secure: false,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 30,
        },
    })
);

routes.push(new AuthRoutes(app));
routes.push(new UsersRoutes(app));

const runningMsg = `Server running at http://localhost:${port}`;

app.get('/', (req: express.Request, res: express.Response) => {
    res.status(200).send(runningMsg);
});

app.listen(port, () => {
    routes.forEach((route: CommonRoutes) => {
        debugLog(`Routes configured for ${route.getName()}`);
    });

    console.log(runningMsg);
});

const errorHandler = async (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    debugLog( `error ${error.message}`); 
    const status = error.status || 500;
    res.status(status).send(error.message);
};

app.use(errorHandler);
