"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgetPassword = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const forgotPasswordSchema_1 = require("../../schemas/auth/forgotPasswordSchema");
const emailHandlers_1 = require("../../utils/emails/emailHandlers");
exports.forgetPassword = (0, catchAsync_1.catchAsync)(async (req, res) => {
    // Validate input
    const validationResult = forgotPasswordSchema_1.forgotPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { email } = validationResult.data;
    // Find user - don't leak existence
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    // Security: Always return same response regardless of user existence
    if (!user) {
        logger_1.logger.warn("Password reset attempted for non-existent email", {
            email,
        });
        return (0, appResponse_1.AppResponse)(
            res,
            200,
            null,
            "If an account exists with this email, a password reset link has been sent"
        );
    }
    // Check if user is soft deleted
    if (user.isDeleted) {
        logger_1.logger.warn("Password reset attempted for deleted user", {
            userId: user.id,
            email,
        });
        return (0, appResponse_1.AppResponse)(
            res,
            200,
            null,
            "If an account exists with this email, a password reset link has been sent"
        );
    }
    // OAuth users can't reset passwords they don't have
    if (user.authProvider !== "LOCAL") {
        logger_1.logger.warn("Password reset attempted for OAuth user", {
            userId: user.id,
            email,
            provider: user.authProvider,
        });
        throw new appError_1.AppError(
            `This account uses ${user.authProvider} authentication. Please sign in with ${user.authProvider}.`,
            400,
            [{ email: "Cannot reset password for OAuth accounts" }]
        );
    }
    try {
        (0, emailHandlers_1.sendPasswordResetEmail)(user);
    } catch (error) {
        logger_1.logger.error("Failed to send password reset email", {
            userId: user.id,
            email: user.email,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new appError_1.AppError(
            "Failed to send password reset email. Please try again later.",
            500
        );
    }
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        null,
        "If an account exists with this email, a password reset link has been sent"
    );
});
