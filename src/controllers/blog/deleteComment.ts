// controllers/blog/deleteComment.ts
import { Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { AuthRequest } from "../../common/constants";
import { deleteCommentSchema } from "../../schemas/blogs/deleteCommentSchema";

interface DeleteCommentResult {
    deletedCommentId: string;
    parentId: string | null;
    deletedRepliesCount: number;
}

export const deleteComment = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AppError("Authentication required to delete comments", 401);
    }

    const validationResult = deleteCommentSchema.safeParse({
        commentId: req.params.commentId,
    });

    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { commentId } = validationResult.data;

    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
            user: {
                select: {
                    id: true,
                },
            },
            blog: {
                select: {
                    sanitySlug: true,
                },
            },
            _count: {
                select: {
                    replies: {
                        where: {
                            isDeleted: false,
                        },
                    },
                },
            },
        },
    });

    if (!comment || comment.isDeleted) {
        throw new AppError("Comment not found", 404);
    }

    if (comment.user.id !== userId) {
        throw new AppError("You can only delete your own comments", 403);
    }

    const parentId = comment.parentId;
    const repliesCount = comment._count.replies;

    await prisma.comment.update({
        where: { id: commentId },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
        },
    });

    await prisma.comment.updateMany({
        where: {
            parentId: commentId,
            isDeleted: false,
        },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
        },
    });

    const result: DeleteCommentResult = {
        deletedCommentId: commentId,
        parentId,
        deletedRepliesCount: repliesCount,
    };

    logger.info("Comment deleted successfully", {
        userId,
        commentId,
        deletedRepliesCount: repliesCount,
    });

    return AppResponse(res, 200, result, "Comment deleted successfully");
});
