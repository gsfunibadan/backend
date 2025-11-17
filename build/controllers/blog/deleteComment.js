"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const deleteCommentSchema_1 = require("../../schemas/blogs/deleteCommentSchema");
exports.deleteComment = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required to delete comments", 401);
    }
    const validationResult = deleteCommentSchema_1.deleteCommentSchema.safeParse({
        commentId: req.params.commentId,
    });
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { commentId } = validationResult.data;
    const comment = await prisma_1.prisma.comment.findUnique({
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
        throw new appError_1.AppError("Comment not found", 404);
    }
    if (comment.user.id !== userId) {
        throw new appError_1.AppError("You can only delete your own comments", 403);
    }
    const parentId = comment.parentId;
    const repliesCount = comment._count.replies;
    await prisma_1.prisma.comment.update({
        where: { id: commentId },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
        },
    });
    await prisma_1.prisma.comment.updateMany({
        where: {
            parentId: commentId,
            isDeleted: false,
        },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
        },
    });
    const result = {
        deletedCommentId: commentId,
        parentId,
        deletedRepliesCount: repliesCount,
    };
    logger_1.logger.info("Comment deleted successfully", {
        userId,
        commentId,
        deletedRepliesCount: repliesCount,
    });
    return (0, appResponse_1.AppResponse)(res, 200, result, "Comment deleted successfully");
});
