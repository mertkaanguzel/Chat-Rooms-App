import express from 'express';
import { validationResult } from 'express-validator';

class BodyValidationMiddleware {
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
}

export default new BodyValidationMiddleware();