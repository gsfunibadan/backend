"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBlog = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const createNewBlogSchema_1 = require("../../schemas/blogs/createNewBlogSchema");
exports.createBlog = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required", 401);
    }
    const validationResult = createNewBlogSchema_1.createNewBlogSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { sanityId, sanitySlug, authorId } = validationResult.data;
    const author = await prisma_1.prisma.author.findUnique({
        where: { id: authorId },
        select: {
            id: true,
            status: true,
            isDeleted: true,
            isSuspended: true,
        },
    });
    if (!author || author.isDeleted) {
        throw new appError_1.AppError("Author not found", 404);
    }
    if (author.status !== "APPROVED") {
        throw new appError_1.AppError("Author must be approved to create blogs", 403);
    }
    if (author.isSuspended) {
        throw new appError_1.AppError("Author is currently suspended", 403);
    }
    if (author.isDeleted) {
        throw new appError_1.AppError("Your author account has been deleted", 403);
    }
    const existingBlog = await prisma_1.prisma.blog.findFirst({
        where: {
            OR: [{ sanityId }, { sanitySlug }],
        },
    });
    if (existingBlog) {
        throw new appError_1.AppError("Blog Already exists", 409);
    }
    const blog = await prisma_1.prisma.blog.create({
        data: {
            sanityId,
            sanitySlug,
            authorId,
            lastSyncedBy: userId,
            lastSyncedAt: new Date(),
        },
        include: {
            author: {
                select: {
                    id: true,
                    userId: true,
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
    logger_1.logger.info("Blog created successfully", {
        blogId: blog.id,
        sanityId: blog.sanityId,
        authorId: blog.authorId,
        createdBy: userId,
    });
    return (0, appResponse_1.AppResponse)(res, 201, blog, "Blog created successfully");
});
