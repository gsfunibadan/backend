import { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { verifyEmailSchema } from "../../schemas/auth/verifyEmailSchema";
import { logger } from "../../utils/logger";

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const validationResult = verifyEmailSchema.safeParse(req.body);

    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { token } = validationResult.data;

    const verificationToken = await prisma.verificationToken.findUnique({
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
        logger.warn("Verification attempted with invalid token", { token });
        throw new AppError("Invalid or expired verification token", 400, [
            { token: "This verification link is invalid" },
        ]);
    }

    if (verificationToken.type !== "EMAIL_VERIFICATION") {
        logger.warn("Wrong token type used for email verification", {
            tokenId: verificationToken.id,
            type: verificationToken.type,
        });
        throw new AppError("Invalid verification token", 400, [
            { token: "This token cannot be used for email verification" },
        ]);
    }

    if (verificationToken.expiresAt < new Date()) {
        logger.info("Expired token used for verification", {
            tokenId: verificationToken.id,
            userId: verificationToken.userId,
            expiredAt: verificationToken.expiresAt,
        });

        await prisma.verificationToken.delete({
            where: { id: verificationToken.id },
        });

        throw new AppError("Verification token has expired", 400, [
            { token: "This verification link has expired. Please request a new one." },
        ]);
    }

    if (verificationToken.usedAt) {
        logger.warn("Already used token attempted", {
            tokenId: verificationToken.id,
            userId: verificationToken.userId,
            usedAt: verificationToken.usedAt,
        });
        throw new AppError("Verification token already used", 400, [
            { token: "This verification link has already been used" },
        ]);
    }

    if (verificationToken.user.isDeleted) {
        logger.warn("Verification attempted for deleted user", {
            userId: verificationToken.userId,
        });
        throw new AppError("Account not found", 404, [{ token: "This account no longer exists" }]);
    }

    if (verificationToken.user.isVerified) {
        logger.info("Verification attempted for already verified user", {
            userId: verificationToken.userId,
        });

        await prisma.verificationToken.update({
            where: { id: verificationToken.id },
            data: { usedAt: new Date() },
        });

        return AppResponse(
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

    const updatedUser = await prisma.$transaction(async (tx) => {
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

    logger.info("User successfully verified email", {
        userId: updatedUser.id,
        email: updatedUser.email,
    });

    return AppResponse(
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
