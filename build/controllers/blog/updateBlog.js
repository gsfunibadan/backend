"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBlog = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const updateBlogSchema_1 = require("../../schemas/blogs/updateBlogSchema");
//This one real simple bro, all we doing here is for example when a blog is edited or something like that let's say the title was edited, we need to also change the slug to reflect that
exports.updateBlog = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required", 401);
    }
    const { blogId } = req.params;
    if (!blogId) {
        throw new appError_1.AppError("Blog ID is required", 400);
    }
    const validationResult = updateBlogSchema_1.updateBlogSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { sanitySlug } = validationResult.data;
    const existingBlog = await prisma_1.prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            isDeleted: true,
            authorId: true,
        },
    });
    if (!existingBlog || existingBlog.isDeleted) {
        throw new appError_1.AppError("Blog not found", 404);
    }
    const author = await prisma_1.prisma.author.findUnique({
        where: { id: existingBlog.authorId },
        select: { userId: true },
    });
    if (!author || author.userId !== userId) {
        throw new appError_1.AppError("You can only update your own blogs", 403);
    }
    const updatedBlog = await prisma_1.prisma.blog.update({
        where: { id: blogId },
        data: {
            sanitySlug,
            publishedAt: new Date(),
            sanityUpdatedAt: new Date(),
            lastSyncedAt: new Date(),
            lastSyncedBy: userId,
        },
        include: {
            author: {
                select: {
                    id: true,
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            userName: true,
                        },
                    },
                },
            },
        },
    });
    logger_1.logger.info("Blog updated successfully", {
        blogId: updatedBlog.id,
        newSlug: sanitySlug,
        updatedBy: userId,
    });
    return (0, appResponse_1.AppResponse)(res, 200, updatedBlog, "Blog updated successfully");
});
