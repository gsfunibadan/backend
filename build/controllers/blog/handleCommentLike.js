"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCommentLike = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const handleCommentLikeSchema_1 = require("../../schemas/blogs/handleCommentLikeSchema");
exports.handleCommentLike = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required to like comments", 401);
    }
    const validationResult = handleCommentLikeSchema_1.handleCommentLikeSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { commentId } = validationResult.data;
    const comment = await prisma_1.prisma.comment.findUnique({
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
        throw new appError_1.AppError("Comment not found", 404);
    }
    // Check if already liked
    const existingLike = await prisma_1.prisma.commentLike.findUnique({
        where: {
            userId_commentId: {
                userId,
                commentId,
            },
        },
    });
    let isLiked;
    if (existingLike) {
        // Unlike
        await prisma_1.prisma.commentLike.delete({
            where: {
                userId_commentId: {
                    userId,
                    commentId,
                },
            },
        });
        isLiked = false;
        logger_1.logger.info("Comment unliked", { userId, commentId });
    } else {
        // Like
        await prisma_1.prisma.commentLike.create({
            data: {
                userId,
                commentId,
            },
        });
        isLiked = true;
        logger_1.logger.info("Comment liked", { userId, commentId });
    }
    // Get updated likes count
    const likesCount = await prisma_1.prisma.commentLike.count({
        where: { commentId },
    });
    const result = {
        isLiked,
        likesCount,
    };
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        result,
        isLiked ? "Comment liked successfully" : "Comment unliked successfully"
    );
});
