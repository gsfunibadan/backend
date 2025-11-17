import { Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { AuthRequest } from "../../common/constants";
import { updateVerifiedViewCountSchema } from "../../schemas/blogs/updateVerifiedViewCountSchema";

interface VerifiedViewResult {
    alreadyRead: boolean;
    readAt: Date;
    blogId?: string;
    userId?: string;
}

export const updateVerifiedViewCount = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AppError("Authentication required to track verified views", 401);
    }

    // Validate request body
    const validationResult = updateVerifiedViewCountSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { sanitySlug } = validationResult.data;

    const blog = await prisma.blog.findUnique({
        where: { sanitySlug },
        select: {
            id: true,
            sanitySlug: true,
            isDeleted: true,
            isApproved: true,
        },
    });

    if (!blog || blog.isDeleted || !blog.isApproved) {
        throw new AppError("Blog post not found", 404);
    }

    const blogId = blog.id;

    const existingRead = await prisma.blogRead.findUnique({
        where: {
            userId_blogId: {
                userId,
                blogId,
            },
        },
        select: {
            readAt: true,
        },
    });

    // User already read this blog
    if (existingRead) {
        const result: VerifiedViewResult = {
            alreadyRead: true,
            readAt: existingRead.readAt,
        };

        logger.info("User has already read this blog", {
            userId,
            blogId,
            sanitySlug,
        });

        return AppResponse(res, 200, result, "User has already read this blog");
    }

    // Create new blog read record (this increments verified view count)
    const blogRead = await prisma.blogRead.create({
        data: {
            userId,
            blogId,
        },
        select: {
            id: true,
            readAt: true,
            userId: true,
            blogId: true,
        },
    });

    const result: VerifiedViewResult = {
        alreadyRead: false,
        readAt: blogRead.readAt,
        blogId: blogRead.blogId,
        userId: blogRead.userId,
    };

    logger.info("Verified view count updated successfully", {
        userId,
        blogId,
        sanitySlug,
        readAt: blogRead.readAt,
    });

    return AppResponse(res, 201, result, "Verified view count updated successfully");
});
