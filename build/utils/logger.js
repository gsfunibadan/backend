"use strict";
// import * as winston from "winston";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
// export const logger = winston.createLogger({
//   level: "info",
//   format: winston.format.combine(
//     winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
//     winston.format.printf(({ level, message, timestamp }) => {
//       const logEntry = `${timestamp} ${level}: ${message}`;
//       return logEntry.replace(/\u001b\[0m/g, "");
//     })
//   ),
//   transports: [
//     new winston.transports.Console(),
//     new winston.transports.File({ filename: "logs/info.log", level: "info" }),
//   ],
// });
// export const stream = {
//   write: (message: string) => {
//     logger.info(message.trim());
//   },
// };
const winston_1 = __importDefault(require("winston"));
const enviroment_1 = require("../config/enviroment");
const isDev = enviroment_1.env.NODE_ENV === "development";
const logger = winston_1.default.createLogger({
    level: isDev ? "debug" : "info",
    format: winston_1.default.format.combine(
        winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston_1.default.format.errors({ stack: true }),
        winston_1.default.format.splat(),
        winston_1.default.format.json()
    ),
    defaultMeta: { service: "api" },
    transports: [
        // Console output
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(
                winston_1.default.format.colorize(),
                winston_1.default.format.printf(({ timestamp, level, message, ...rest }) => {
                    const meta = Object.keys(rest).length ? JSON.stringify(rest) : "";
                    return `[${timestamp}] ${level}: ${message} ${meta}`;
                })
            ),
        }),
        // Error logs to file
        new winston_1.default.transports.File({
            filename: "logs/error.log",
            level: "error",
        }),
        // All logs to file
        new winston_1.default.transports.File({
            filename: "logs/app.log",
        }),
    ],
});
exports.logger = logger;
