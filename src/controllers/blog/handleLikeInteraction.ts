import { Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { AuthRequest } from "../../common/constants";
import { handleLikeInteractionSchema } from "../../schemas/blogs/handleLikeInteractionSchema";

interface BlogLikeResult {
    isLiked: boolean;
    likesCount: number;
}

export const handleLikeInteraction = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AppError("Authentication required to like blogs", 401);
    }

    const validationResult = handleLikeInteractionSchema.safeParse(req.params);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { blogId } = validationResult.data;

    const blog = await prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            sanitySlug: true,
            isDeleted: true,
            isApproved: true,
        },
    });

    if (!blog || blog.isDeleted || !blog.isApproved) {
        throw new AppError("Blog not found", 404);
    }

    const existingLike = await prisma.blogLike.findUnique({
        where: {
            userId_blogId: {
                userId,
                blogId,
            },
        },
    });

    let isLiked: boolean;

    if (existingLike) {
        await prisma.blogLike.delete({
            where: {
                userId_blogId: {
                    userId,
                    blogId,
                },
            },
        });
        isLiked = false;
        logger.info("Blog unliked", { userId, blogId });
    } else {
        await prisma.blogLike.create({
            data: {
                userId,
                blogId,
            },
        });
        isLiked = true;
        logger.info("Blog liked", { userId, blogId });
    }

    const likesCount = await prisma.blogLike.count({
        where: { blogId },
    });

    const result: BlogLikeResult = {
        isLiked,
        likesCount,
    };

    return AppResponse(
        res,
        200,
        result,
        isLiked ? "Blog liked successfully" : "Blog unliked successfully"
    );
});
