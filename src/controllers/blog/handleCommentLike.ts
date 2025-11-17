import { Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { AuthRequest } from "../../common/constants";
import { handleCommentLikeSchema } from "../../schemas/blogs/handleCommentLikeSchema";

interface CommentLikeResult {
    isLiked: boolean;
    likesCount: number;
}

export const handleCommentLike = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AppError("Authentication required to like comments", 401);
    }

    const validationResult = handleCommentLikeSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { commentId } = validationResult.data;

    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: {
            id: true,
            isDeleted: true,
            blog: {
                select: {
                    id: true,
                    sanitySlug: true,
                    isDeleted: true,
                    isApproved: true,
                },
            },
        },
    });

    if (!comment || comment.isDeleted || comment.blog.isDeleted || !comment.blog.isApproved) {
        throw new AppError("Comment not found", 404);
    }

    // Check if already liked
    const existingLike = await prisma.commentLike.findUnique({
        where: {
            userId_commentId: {
                userId,
                commentId,
            },
        },
    });

    let isLiked: boolean;

    if (existingLike) {
        // Unlike
        await prisma.commentLike.delete({
            where: {
                userId_commentId: {
                    userId,
                    commentId,
                },
            },
        });
        isLiked = false;
        logger.info("Comment unliked", { userId, commentId });
    } else {
        // Like
        await prisma.commentLike.create({
            data: {
                userId,
                commentId,
            },
        });
        isLiked = true;
        logger.info("Comment liked", { userId, commentId });
    }

    // Get updated likes count
    const likesCount = await prisma.commentLike.count({
        where: { commentId },
    });

    const result: CommentLikeResult = {
        isLiked,
        likesCount,
    };

    return AppResponse(
        res,
        200,
        result,
        isLiked ? "Comment liked successfully" : "Comment unliked successfully"
    );
});
