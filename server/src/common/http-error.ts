import { type NextFunction, type Request, type Response } from 'express';

export type StatusError = Error & { status?: number };

export function withStatus(error: unknown, status: number): void {
    (error as StatusError).status = status;
}

export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    const message = (err as Error)?.message ?? 'Internal Server Error';
    const status = (err as StatusError)?.status ?? 500;
    res.status(status).json({ error: message });
}