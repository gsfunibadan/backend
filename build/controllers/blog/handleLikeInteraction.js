"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLikeInteraction = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const handleLikeInteractionSchema_1 = require("../../schemas/blogs/handleLikeInteractionSchema");
exports.handleLikeInteraction = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required to like blogs", 401);
    }
    const validationResult = handleLikeInteractionSchema_1.handleLikeInteractionSchema.safeParse(
        req.params
    );
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { blogId } = validationResult.data;
    const blog = await prisma_1.prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            sanitySlug: true,
            isDeleted: true,
            isApproved: true,
        },
    });
    if (!blog || blog.isDeleted || !blog.isApproved) {
        throw new appError_1.AppError("Blog not found", 404);
    }
    const existingLike = await prisma_1.prisma.blogLike.findUnique({
        where: {
            userId_blogId: {
                userId,
                blogId,
            },
        },
    });
    let isLiked;
    if (existingLike) {
        await prisma_1.prisma.blogLike.delete({
            where: {
                userId_blogId: {
                    userId,
                    blogId,
                },
            },
        });
        isLiked = false;
        logger_1.logger.info("Blog unliked", { userId, blogId });
    } else {
        await prisma_1.prisma.blogLike.create({
            data: {
                userId,
                blogId,
            },
        });
        isLiked = true;
        logger_1.logger.info("Blog liked", { userId, blogId });
    }
    const likesCount = await prisma_1.prisma.blogLike.count({
        where: { blogId },
    });
    const result = {
        isLiked,
        likesCount,
    };
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        result,
        isLiked ? "Blog liked successfully" : "Blog unliked successfully"
    );
});
