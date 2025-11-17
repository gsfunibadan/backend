// import * as winston from "winston";

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

import winston from "winston";
import { env } from "../config/enviroment";

const isDev = env.NODE_ENV === "development";

const logger = winston.createLogger({
    level: isDev ? "debug" : "info",
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: "api" },
    transports: [
        // Console output
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...rest }) => {
                    const meta = Object.keys(rest).length ? JSON.stringify(rest) : "";
                    return `[${timestamp}] ${level}: ${message} ${meta}`;
                })
            ),
        }),
        // Error logs to file
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
        }),
        // All logs to file
        new winston.transports.File({
            filename: "logs/app.log",
        }),
    ],
});

export { logger };
