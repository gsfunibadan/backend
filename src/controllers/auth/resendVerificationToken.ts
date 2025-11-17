// controllers/auth/resendVerificationToken.ts
import { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";

import { sendWelcomeEmail } from "../../utils/emails/emailHandlers";
import { logger } from "../../utils/logger"; // Your logger
import { resendVerificationTokenSchema } from "../../schemas/auth/resendVerificationTokenSchema";

export const resendVerificationToken = catchAsync(async (req: Request, res: Response) => {
    const validationResult = resendVerificationTokenSchema.safeParse(req.body);

    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { email } = validationResult.data;

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        logger.warn("Verification resend attempted for non-existent email", {
            email,
        });

        return AppResponse(
            res,
            200,
            null,
            "If an account exists with this email, a verification link has been sent"
        );
    }

    if (user.isDeleted) {
        logger.warn("Verification resend attempted for deleted user", {
            userId: user.id,
            email,
        });
        return AppResponse(
            res,
            200,
            null,
            "If an account exists with this email, a verification link has been sent"
        );
    }

    if (user.isVerified) {
        throw new AppError("This account is already verified", 400, [
            { email: "Account already verified" },
        ]);
    }

    const deletedCount = await prisma.verificationToken.deleteMany({
        where: {
            userId: user.id,
            type: "EMAIL_VERIFICATION",
        },
    });

    logger.info("Deleted old verification tokens", {
        userId: user.id,
        count: deletedCount.count,
    });

    // 7. Send new verification email (creates new token inside)
    try {
        await sendWelcomeEmail(user);
    } catch (error) {
        logger.error("Failed to send verification email", {
            userId: user.id,
            email: user.email,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new AppError("Failed to send verification email. Please try again later.", 500);
    }

    // 8. Return success
    return AppResponse(
        res,
        200,
        null,
        "Verification email sent successfully. Please check your inbox."
    );
});
