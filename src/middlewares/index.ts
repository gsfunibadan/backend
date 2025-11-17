import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger";
import { env } from "../config/enviroment";

export function setupMiddleware(app: Express): void {
    logger.info("⚙️  Setting up middleware...");

    // Trust proxy (important if behind nginx/load balancer)
    app.set("trust proxy", 1);

    // Security headers
    app.use(helmet());
    app.use(helmet.hidePoweredBy());
    app.use(
        helmet.contentSecurityPolicy({
            useDefaults: true,
            directives: {
                "default-src": ["'self'"],
                "script-src": ["'self'"],
            },
        })
    );
    app.use(helmet.noSniff());
    app.use(helmet.ieNoOpen());
    app.use(helmet.dnsPrefetchControl());
    app.use(helmet.permittedCrossDomainPolicies());

    // CORS
    app.use(
        cors({
            origin:
                env.NODE_ENV === "production"
                    ? ["https://gofamint-ui.vercel.app/", "https://gofamint-ui.vercel.app"]
                    : ["http://localhost:3000", "http://localhost:3001"],
            credentials: true,
        })
    );

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: env.NODE_ENV === "development" ? 1000 : 100, // More permissive in dev
        message: "⚠️  Too many requests, please try again later",
        standardHeaders: true,
        skip: () => env.NODE_ENV === "development", // Disable in dev
    });
    app.use(limiter);

    // Body parsing
    app.use(express.json({ limit: "10kb" }));
    app.use(express.urlencoded({ limit: "5mb", extended: true }));
    app.use(cookieParser());

    app.use(compression());

    // Request logging
    app.use((req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on("finish", () => {
            const duration = Date.now() - start;
            logger.debug(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        });
        next();
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
        next();
    });

    logger.info("✅ Middleware setup complete");
}
