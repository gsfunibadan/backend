import { logger } from "./logger";

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public errors?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(message: string, statusCode: number = 500, errors?: any[]) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        this.errors = errors;

        const logLevel = statusCode >= 500 ? "error" : "warn";

        logger[logLevel]({
            message,
            statusCode,
            errors: this.errors,

            timestamp: new Date().toISOString(),
        });

        Error.captureStackTrace(this, this.constructor);
    }
}
