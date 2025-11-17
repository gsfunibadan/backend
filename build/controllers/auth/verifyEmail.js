"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmail = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const verifyEmailSchema_1 = require("../../schemas/auth/verifyEmailSchema");
const logger_1 = require("../../utils/logger");
exports.verifyEmail = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = verifyEmailSchema_1.verifyEmailSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { token } = validationResult.data;
    const verificationToken = await prisma_1.prisma.verificationToken.findUnique({
        where: {
            token,
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    isVerified: true,
                    isDeleted: true,
                },
            },
        },
    });
    if (!verificationToken) {
        logger_1.logger.warn("Verification attempted with invalid token", { token });
        throw new appError_1.AppError("Invalid or expired verification token", 400, [
            { token: "This verification link is invalid" },
        ]);
    }
    if (verificationToken.type !== "EMAIL_VERIFICATION") {
        logger_1.logger.warn("Wrong token type used for email verification", {
            tokenId: verificationToken.id,
            type: verificationToken.type,
        });
        throw new appError_1.AppError("Invalid verification token", 400, [
            { token: "This token cannot be used for email verification" },
        ]);
    }
    if (verificationToken.expiresAt < new Date()) {
        logger_1.logger.info("Expired token used for verification", {
            tokenId: verificationToken.id,
            userId: verificationToken.userId,
            expiredAt: verificationToken.expiresAt,
        });
        await prisma_1.prisma.verificationToken.delete({
            where: { id: verificationToken.id },
        });
        throw new appError_1.AppError("Verification token has expired", 400, [
            { token: "This verification link has expired. Please request a new one." },
        ]);
    }
    if (verificationToken.usedAt) {
        logger_1.logger.warn("Already used token attempted", {
            tokenId: verificationToken.id,
            userId: verificationToken.userId,
            usedAt: verificationToken.usedAt,
        });
        throw new appError_1.AppError("Verification token already used", 400, [
            { token: "This verification link has already been used" },
        ]);
    }
    if (verificationToken.user.isDeleted) {
        logger_1.logger.warn("Verification attempted for deleted user", {
            userId: verificationToken.userId,
        });
        throw new appError_1.AppError("Account not found", 404, [
            { token: "This account no longer exists" },
        ]);
    }
    if (verificationToken.user.isVerified) {
        logger_1.logger.info("Verification attempted for already verified user", {
            userId: verificationToken.userId,
        });
        await prisma_1.prisma.verificationToken.update({
            where: { id: verificationToken.id },
            data: { usedAt: new Date() },
        });
        return (0, appResponse_1.AppResponse)(
            res,
            200,
            {
                user: {
                    email: verificationToken.user.email,
                    firstName: verificationToken.user.firstName,
                    isVerified: true,
                },
            },
            "Your account is already verified"
        );
    }
    const updatedUser = await prisma_1.prisma.$transaction(async (tx) => {
        // Mark token as used
        await tx.verificationToken.update({
            where: { id: verificationToken.id },
            data: { usedAt: new Date() },
        });
        // Verify the user
        const user = await tx.user.update({
            where: { id: verificationToken.userId },
            data: { isVerified: true },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                userName: true,
                isVerified: true,
            },
        });
        return user;
    });
    logger_1.logger.info("User successfully verified email", {
        userId: updatedUser.id,
        email: updatedUser.email,
    });
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        {
            user: {
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                userName: updatedUser.userName,
                isVerified: updatedUser.isVerified,
            },
        },
        "Email verified successfully! Your account is now active."
    );
});
