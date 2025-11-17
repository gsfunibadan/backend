"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = bootstrap;
const express_1 = __importDefault(require("express"));
const logger_1 = require("./utils/logger");
const errorHandling_1 = require("./middlewares/errorHandling");
const enviroment_1 = require("./config/enviroment");
const middlewares_1 = require("./middlewares");
const authRouter_1 = require("./routes/authRouter");
const userRouter_1 = require("./routes/userRouter");
const blogRouter_1 = require("./routes/blogRouter");
const adminRouter_1 = require("./routes/adminRouter");
const authorRouter_1 = require("./routes/authorRouter");
const emailServiceConfig_1 = require("./config/emailServiceConfig");
let isShuttingDown = false;
async function gracefulShutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger_1.logger.info("🛑 Starting graceful shutdown...");
    try {
        logger_1.logger.info("✅ Graceful shutdown complete");
    } catch (error) {
        logger_1.logger.error("❌ Error during shutdown:", error);
        process.exit(1);
    }
}
async function bootstrap() {
    try {
        logger_1.logger.info("🚀 Bootstrapping application...");
        // 2. Create Express app
        const app = (0, express_1.default)();
        (0, middlewares_1.setupMiddleware)(app);
        app.get("/health", (req, res) => {
            res.status(200).json({
                status: "ok",
                timestamp: new Date().toISOString(),
            });
        });
        await (0, emailServiceConfig_1.initializeEmailService)();
        app.use("/api/v1/auth", authRouter_1.authRouter);
        app.use("/api/v1/user", userRouter_1.userRouter);
        app.use("/api/v1/blog", blogRouter_1.blogRouter);
        app.use("/api/v1/admin", adminRouter_1.adminRouter);
        app.use("/api/v1/author", authorRouter_1.authorRouter);
        app.use(errorHandling_1.notFoundHandler);
        app.use(errorHandling_1.errorHandler);
        // 6. Start server
        app.listen(enviroment_1.env.PORT, () => {
            logger_1.logger.info(
                `✅ Server running on port ${enviroment_1.env.PORT} (${enviroment_1.env.NODE_ENV})`
            );
        });
        // 7. Graceful shutdown handlers
        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT", gracefulShutdown);
        process.on("uncaughtException", (error) => {
            logger_1.logger.error("💥 UNCAUGHT EXCEPTION:", error);
            gracefulShutdown().then(() => process.exit(1));
        });
        process.on("unhandledRejection", (reason) => {
            logger_1.logger.error("💥 UNHANDLED REJECTION:", reason);
            gracefulShutdown().then(() => process.exit(1));
        });
    } catch (error) {
        logger_1.logger.error("❌ Bootstrap failed:", error);
        process.exit(1);
    }
}
bootstrap().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
