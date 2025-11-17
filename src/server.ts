import express, { Express } from "express";
import { logger } from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandling";
import { env } from "./config/enviroment";
import { setupMiddleware } from "./middlewares";
import { authRouter } from "./routes/authRouter";
import { userRouter } from "./routes/userRouter";
import { blogRouter } from "./routes/blogRouter";
import { adminRouter } from "./routes/adminRouter";
import { authorRouter } from "./routes/authorRouter";
import { initializeEmailService } from "./config/emailServiceConfig";
import { prisma } from "./database/prisma";

async function connectDatabase(): Promise<void> {
    try {
        await prisma.$connect();
        logger.info("Database connected successfully");
    } catch (error) {
        logger.error("Database connection failed:", error);
        throw error;
    }
}

async function disconnectDatabase(): Promise<void> {
    try {
        await prisma.$disconnect();
        logger.info("Database disconnected");
    } catch (error) {
        logger.error("Error disconnecting database:", error);
        throw error;
    }
}

let isShuttingDown = false;

async function gracefulShutdown(): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info("Starting graceful shutdown...");

    try {
        await disconnectDatabase();
        logger.info("Graceful shutdown complete");
    } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
    }
}

export async function bootstrap(): Promise<void> {
    try {
        logger.info("Bootstrapping application...");

        await connectDatabase();

        const app: Express = express();

        setupMiddleware(app);
        app.get("/", (req, res) => {
            res.status(200).json({
                message: "GoFamint UI API",
            });
        });
        app.get("/health", async (req, res) => {
            try {
                await prisma.$queryRaw`SELECT 1`;

                res.status(200).json({
                    status: "ok",
                    timestamp: new Date().toISOString(),
                    database: "connected",
                });
            } catch (error) {
                logger.error("Health check failed", error);

                res.status(503).json({
                    status: "error",
                    timestamp: new Date().toISOString(),
                });
            }
        });
        await initializeEmailService();
        app.use("/api/v1/auth", authRouter);
        app.use("/api/v1/user", userRouter);
        app.use("/api/v1/blog", blogRouter);
        app.use("/api/v1/admin", adminRouter);
        app.use("/api/v1/author", authorRouter);

        app.use(notFoundHandler);

        app.use(errorHandler);

        const PORT = env.PORT;
        const HOST = "0.0.0.0";

        app.listen(PORT, HOST, () => {
            logger.info(`Server running on ${HOST}:${PORT} (${env.NODE_ENV})`);
        });

        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT", gracefulShutdown);

        process.on("uncaughtException", (error) => {
            logger.error("UNCAUGHT EXCEPTION:", error);
            gracefulShutdown().then(() => process.exit(1));
        });

        process.on("unhandledRejection", (reason) => {
            logger.error("UNHANDLED REJECTION:", reason);
            gracefulShutdown().then(() => process.exit(1));
        });
    } catch (error) {
        logger.error("❌ Bootstrap failed:", error);
        process.exit(1);
    }
}

bootstrap().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
