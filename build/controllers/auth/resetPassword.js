"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const helpers_1 = require("../../utils/helpers");
const logger_1 = require("../../utils/logger");
const resetPasswordSchema_1 = require("../../schemas/auth/resetPasswordSchema");
exports.resetPassword = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = resetPasswordSchema_1.resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { resetToken, password } = validationResult.data;
    const verificationToken = await prisma_1.prisma.verificationToken.findUnique({
        where: {
            token: resetToken,
        },
        include: {
            user: true,
        },
    });
    if (!verificationToken || verificationToken.usedAt) {
        logger_1.logger.warn("Invalid or already used reset token", {
            token: resetToken.substring(0, 10) + "...",
        });
        throw new appError_1.AppError(
            "Invalid or expired reset token. Please request a new password reset.",
            400,
            [{ resetToken: "Token is invalid or has already been used" }]
        );
    }
    if (verificationToken.type !== "PASSWORD_RESET") {
        logger_1.logger.warn("Wrong token type used for password reset", {
            userId: verificationToken.userId,
            tokenType: verificationToken.type,
        });
        throw new appError_1.AppError("Invalid reset token", 400, [
            { resetToken: "This token cannot be used for password reset" },
        ]);
    }
    if (verificationToken.expiresAt < new Date()) {
        logger_1.logger.warn("Expired reset token used", {
            userId: verificationToken.userId,
            expiredAt: verificationToken.expiresAt,
        });
        throw new appError_1.AppError(
            "Reset token has expired. Please request a new password reset.",
            400,
            [{ resetToken: "Token has expired" }]
        );
    }
    const user = verificationToken.user;
    // User deleted? Can't reset what doesn't exist
    if (user.isDeleted) {
        logger_1.logger.warn("Password reset attempted for deleted user", {
            userId: user.id,
        });
        throw new appError_1.AppError("Account not found", 404);
    }
    if (user.authProvider !== "LOCAL") {
        logger_1.logger.warn("Password reset attempted for OAuth user", {
            userId: user.id,
            provider: user.authProvider,
        });
        throw new appError_1.AppError("Cannot reset password for accounts using social login", 400);
    }
    // Hash that new password
    const hashedPassword = await (0, helpers_1.hashPassword)(password);
    // Transaction time: update password, mark token as used, nuke all sessions
    await prisma_1.prisma.$transaction(async (tx) => {
        // Update the password
        await tx.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                updatedAt: new Date(),
            },
        });
        // Mark token as used
        await tx.verificationToken.update({
            where: { id: verificationToken.id },
            data: {
                usedAt: new Date(),
            },
        });
        // Revoke all existing sessions (force re-login everywhere)
        //funny thing is I have a revokeAllUserTokens function but I don't use it here, this one still dey work sha
        await tx.session.deleteMany({
            where: { userId: user.id },
        });
    });
    logger_1.logger.info("Password reset successful", {
        userId: user.id,
    });
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        null,
        "Password reset successful. Please log in with your new password."
    );
});
