"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerificationToken = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const emailHandlers_1 = require("../../utils/emails/emailHandlers");
const logger_1 = require("../../utils/logger"); // Your logger
const resendVerificationTokenSchema_1 = require("../../schemas/auth/resendVerificationTokenSchema");
exports.resendVerificationToken = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult =
        resendVerificationTokenSchema_1.resendVerificationTokenSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { email } = validationResult.data;
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        logger_1.logger.warn("Verification resend attempted for non-existent email", {
            email,
        });
        return (0, appResponse_1.AppResponse)(
            res,
            200,
            null,
            "If an account exists with this email, a verification link has been sent"
        );
    }
    if (user.isDeleted) {
        logger_1.logger.warn("Verification resend attempted for deleted user", {
            userId: user.id,
            email,
        });
        return (0, appResponse_1.AppResponse)(
            res,
            200,
            null,
            "If an account exists with this email, a verification link has been sent"
        );
    }
    if (user.isVerified) {
        throw new appError_1.AppError("This account is already verified", 400, [
            { email: "Account already verified" },
        ]);
    }
    const deletedCount = await prisma_1.prisma.verificationToken.deleteMany({
        where: {
            userId: user.id,
            type: "EMAIL_VERIFICATION",
        },
    });
    logger_1.logger.info("Deleted old verification tokens", {
        userId: user.id,
        count: deletedCount.count,
    });
    // 7. Send new verification email (creates new token inside)
    try {
        await (0, emailHandlers_1.sendWelcomeEmail)(user);
    } catch (error) {
        logger_1.logger.error("Failed to send verification email", {
            userId: user.id,
            email: user.email,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new appError_1.AppError(
            "Failed to send verification email. Please try again later.",
            500
        );
    }
    // 8. Return success
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        null,
        "Verification email sent successfully. Please check your inbox."
    );
});
