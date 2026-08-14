import express from 'express';
import { validationResult, matchedData } from 'express-validator';
import { withStatus } from './http-error';

class BodyValidationMiddleware {
    /*
    async verifyBodyFieldsErrors (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) {
        try {
            validationResult(req).throw();
        } catch (error: any) {
            error.status = 400;
            next(error);
        }
        next();
    }
*/
    async verifyBodyFieldsErrors (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) {
        const errors = validationResult(req);
        const data = matchedData(req);

        try {
            if (!errors.isEmpty()) {
                throw new Error(JSON.stringify(errors.mapped()));
            }
        } catch (error) {
            withStatus(error, 422);
            next(error);
        }

        try {
            if (Object.keys(data).length !== Object.keys(req.body).length) {
                throw new Error('Invalid request body.');
            }
        } catch (error) {
            withStatus(error, 400);
            next(error);
        }
        return next();
    }
}

export default new BodyValidationMiddleware();