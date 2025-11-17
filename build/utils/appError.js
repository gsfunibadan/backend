"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
const logger_1 = require("./logger");
class AppError extends Error {
    statusCode;
    isOperational;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(message, statusCode = 500, errors) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.errors = errors;
        const logLevel = statusCode >= 500 ? "error" : "warn";
        logger_1.logger[logLevel]({
            message,
            statusCode,
            errors: this.errors,
            timestamp: new Date().toISOString(),
        });
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
