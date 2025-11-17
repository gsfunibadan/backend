"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const logger_1 = require("../utils/logger");
const appError_1 = require("../utils/appError");
const notFoundHandler = (req, res, next) => {
    const error = new appError_1.AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, req, res) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";
    logger_1.logger.error({
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
    const response = {
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
exports.errorHandler = errorHandler;
