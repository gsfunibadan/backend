import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getPublicUserProfileSchema } from "../../schemas/user/getPublicUserProfileSchema";
import { AppError } from "../../utils/appError";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { prisma } from "../../database/prisma";
import { logger } from "../../utils/logger";
import { AppResponse } from "../../utils/appResponse";

interface PublicUserProfile {
    userName: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
    bio: string | null;
}

export const getPublicUserProfile = catchAsync(async (req: Request, res: Response) => {
    const validationResult = getPublicUserProfileSchema.safeParse({
        userName: req.params.userName,
    });

    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { userName } = validationResult.data;

    const user = await prisma.user.findUnique({
        where: { userName },
        select: {
            userName: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            isDeleted: true,
            bio: true,
        },
    });

    if (!user || user.isDeleted) {
        logger.warn("Public profile requested for non-existent user", {
            userName,
        });
        throw new AppError("User not found", 404);
    }

    const publicProfile: PublicUserProfile = {
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        bio: user.bio,
    };

    logger.info("Public user profile fetched successfully", {
        userName,
    });

    return AppResponse(res, 200, publicProfile, "Public profile retrieved successfully");
});
