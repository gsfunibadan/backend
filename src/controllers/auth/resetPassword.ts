import { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { hashPassword } from "../../utils/helpers";
import { logger } from "../../utils/logger";
import { resetPasswordSchema } from "../../schemas/auth/resetPasswordSchema";

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
    const validationResult = resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { resetToken, password } = validationResult.data;

    const verificationToken = await prisma.verificationToken.findUnique({
        where: {
            token: resetToken,
        },
        include: {
            user: true,
        },
    });

    if (!verificationToken || verificationToken.usedAt) {
        logger.warn("Invalid or already used reset token", {
            token: resetToken.substring(0, 10) + "...",
        });

        throw new AppError(
            "Invalid or expired reset token. Please request a new password reset.",
            400,
            [{ resetToken: "Token is invalid or has already been used" }]
        );
    }

    if (verificationToken.type !== "PASSWORD_RESET") {
        logger.warn("Wrong token type used for password reset", {
            userId: verificationToken.userId,
            tokenType: verificationToken.type,
        });

        throw new AppError("Invalid reset token", 400, [
            { resetToken: "This token cannot be used for password reset" },
        ]);
    }

    if (verificationToken.expiresAt < new Date()) {
        logger.warn("Expired reset token used", {
            userId: verificationToken.userId,
            expiredAt: verificationToken.expiresAt,
        });

        throw new AppError("Reset token has expired. Please request a new password reset.", 400, [
            { resetToken: "Token has expired" },
        ]);
    }

    const user = verificationToken.user;

    // User deleted? Can't reset what doesn't exist
    if (user.isDeleted) {
        logger.warn("Password reset attempted for deleted user", {
            userId: user.id,
        });

        throw new AppError("Account not found", 404);
    }

    if (user.authProvider !== "LOCAL") {
        logger.warn("Password reset attempted for OAuth user", {
            userId: user.id,
            provider: user.authProvider,
        });

        throw new AppError("Cannot reset password for accounts using social login", 400);
    }

    // Hash that new password
    const hashedPassword = await hashPassword(password);

    // Transaction time: update password, mark token as used, nuke all sessions
    await prisma.$transaction(async (tx) => {
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

    logger.info("Password reset successful", {
        userId: user.id,
    });

    return AppResponse(
        res,
        200,
        null,
        "Password reset successful. Please log in with your new password."
    );
});
