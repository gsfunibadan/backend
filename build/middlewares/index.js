"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMiddleware = setupMiddleware;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("../utils/logger");
const enviroment_1 = require("../config/enviroment");
function setupMiddleware(app) {
    logger_1.logger.info("⚙️  Setting up middleware...");
    // Trust proxy (important if behind nginx/load balancer)
    app.set("trust proxy", 1);
    // Security headers
    app.use((0, helmet_1.default)());
    app.use(helmet_1.default.hidePoweredBy());
    app.use(
        helmet_1.default.contentSecurityPolicy({
            useDefaults: true,
            directives: {
                "default-src": ["'self'"],
                "script-src": ["'self'"],
            },
        })
    );
    app.use(helmet_1.default.noSniff());
    app.use(helmet_1.default.ieNoOpen());
    app.use(helmet_1.default.dnsPrefetchControl());
    app.use(helmet_1.default.permittedCrossDomainPolicies());
    // CORS
    app.use(
        (0, cors_1.default)({
            origin:
                enviroment_1.env.NODE_ENV === "production"
                    ? ["https://gofamint-ui.vercel.app/", "https://gofamint-ui.vercel.app"]
                    : ["http://localhost:3000", "http://localhost:3001"],
            credentials: true,
        })
    );
    // Rate limiting
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: enviroment_1.env.NODE_ENV === "development" ? 1000 : 100, // More permissive in dev
        message: "⚠️  Too many requests, please try again later",
        standardHeaders: true,
        skip: () => enviroment_1.env.NODE_ENV === "development", // Disable in dev
    });
    app.use(limiter);
    // Body parsing
    app.use(express_1.default.json({ limit: "10kb" }));
    app.use(express_1.default.urlencoded({ limit: "5mb", extended: true }));
    app.use((0, cookie_parser_1.default)());
    app.use((0, compression_1.default)());
    // Request logging
    app.use((req, res, next) => {
        const start = Date.now();
        res.on("finish", () => {
            const duration = Date.now() - start;
            logger_1.logger.debug(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        });
        next();
    });
    app.use((req, res, next) => {
        next();
    });
    logger_1.logger.info("✅ Middleware setup complete");
}
