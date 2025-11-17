// controllers/auth/forgotPassword.ts
import { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";

import { logger } from "../../utils/logger";
import { forgotPasswordSchema } from "../../schemas/auth/forgotPasswordSchema";
import { sendPasswordResetEmail } from "../../utils/emails/emailHandlers";

export const forgetPassword = catchAsync(async (req: Request, res: Response) => {
    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { email } = validationResult.data;

    // Find user - don't leak existence
    const user = await prisma.user.findUnique({
        where: { email },
    });

    // Security: Always return same response regardless of user existence
    if (!user) {
        logger.warn("Password reset attempted for non-existent email", {
            email,
        });

        return AppResponse(
            res,
            200,
            null,
            "If an account exists with this email, a password reset link has been sent"
        );
    }

    // Check if user is soft deleted
    if (user.isDeleted) {
        logger.warn("Password reset attempted for deleted user", {
            userId: user.id,
            email,
        });

        return AppResponse(
            res,
            200,
            null,
            "If an account exists with this email, a password reset link has been sent"
        );
    }

    // OAuth users can't reset passwords they don't have
    if (user.authProvider !== "LOCAL") {
        logger.warn("Password reset attempted for OAuth user", {
            userId: user.id,
            email,
            provider: user.authProvider,
        });

        throw new AppError(
            `This account uses ${user.authProvider} authentication. Please sign in with ${user.authProvider}.`,
            400,
            [{ email: "Cannot reset password for OAuth accounts" }]
        );
    }

    try {
        sendPasswordResetEmail(user);
    } catch (error) {
        logger.error("Failed to send password reset email", {
            userId: user.id,
            email: user.email,
            error: error instanceof Error ? error.message : "Unknown error",
        });

        throw new AppError("Failed to send password reset email. Please try again later.", 500);
    }

    return AppResponse(
        res,
        200,
        null,
        "If an account exists with this email, a password reset link has been sent"
    );
});
