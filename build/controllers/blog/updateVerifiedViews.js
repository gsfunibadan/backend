"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVerifiedViewCount = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const updateVerifiedViewCountSchema_1 = require("../../schemas/blogs/updateVerifiedViewCountSchema");
exports.updateVerifiedViewCount = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required to track verified views", 401);
    }
    // Validate request body
    const validationResult =
        updateVerifiedViewCountSchema_1.updateVerifiedViewCountSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { sanitySlug } = validationResult.data;
    const blog = await prisma_1.prisma.blog.findUnique({
        where: { sanitySlug },
        select: {
            id: true,
            sanitySlug: true,
            isDeleted: true,
            isApproved: true,
        },
    });
    if (!blog || blog.isDeleted || !blog.isApproved) {
        throw new appError_1.AppError("Blog post not found", 404);
    }
    const blogId = blog.id;
    const existingRead = await prisma_1.prisma.blogRead.findUnique({
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
        const result = {
            alreadyRead: true,
            readAt: existingRead.readAt,
        };
        logger_1.logger.info("User has already read this blog", {
            userId,
            blogId,
            sanitySlug,
        });
        return (0, appResponse_1.AppResponse)(res, 200, result, "User has already read this blog");
    }
    // Create new blog read record (this increments verified view count)
    const blogRead = await prisma_1.prisma.blogRead.create({
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
    const result = {
        alreadyRead: false,
        readAt: blogRead.readAt,
        blogId: blogRead.blogId,
        userId: blogRead.userId,
    };
    logger_1.logger.info("Verified view count updated successfully", {
        userId,
        blogId,
        sanitySlug,
        readAt: blogRead.readAt,
    });
    return (0, appResponse_1.AppResponse)(
        res,
        201,
        result,
        "Verified view count updated successfully"
    );
});
