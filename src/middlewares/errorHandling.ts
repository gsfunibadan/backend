import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { AppError } from "../utils/appError";
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};

export const errorHandler = (err: AppError, req: Request, res: Response) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";

    logger.error({
        message: err.message,
        statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        stack: err.stack,
        errors: err.errors,
        timestamp: new Date().toISOString(),
    });

    // eslint-disable-next-line
    const response: any = {
        success: false,
        message,
    };

    if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        response.errors = err.errors;
    }

    // Include stack trace in development (helps a nigga debug easily)
    if (process.env.NODE_ENV === "development") {
        response.stack = err.stack;
    }

    return res.status(statusCode).json(response);
};
