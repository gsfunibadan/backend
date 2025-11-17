"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGenericViewCount = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const updateGenericViewCountSchema_1 = require("../../schemas/blogs/updateGenericViewCountSchema");
exports.updateGenericViewCount = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = updateGenericViewCountSchema_1.updateGenericViewCountSchema.safeParse(
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
            genericViewCount: true,
            isDeleted: true,
            isApproved: true,
        },
    });
    if (!blog || blog.isDeleted || !blog.isApproved) {
        throw new appError_1.AppError("Blog post not found", 404);
    }
    const updatedBlog = await prisma_1.prisma.blog.update({
        where: { id: blog.id },
        data: {
            genericViewCount: {
                increment: 1,
            },
        },
        select: {
            id: true,
            sanitySlug: true,
            genericViewCount: true,
        },
    });
    const result = {
        sanitySlug: updatedBlog.sanitySlug,
        genericViewCount: updatedBlog.genericViewCount,
        blogId: updatedBlog.id,
    };
    logger_1.logger.info("Generic view count incremented", {
        blogId: updatedBlog.id,
        newCount: updatedBlog.genericViewCount,
    });
    return (0, appResponse_1.AppResponse)(res, 200, result, "View count updated successfully");
});
