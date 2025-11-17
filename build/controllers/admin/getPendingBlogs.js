"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingBlogs = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const appError_1 = require("../../utils/appError");
const getPendingBlogsSchema_1 = require("../../schemas/admin/getPendingBlogsSchema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const prisma_1 = require("../../database/prisma");
const appResponse_1 = require("../../utils/appResponse");
exports.getPendingBlogs = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.admin) {
        throw new appError_1.AppError("Admin authentication required", 401);
    }
    const validationResult = getPendingBlogsSchema_1.getPendingBlogsSchema.safeParse(req.query);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    //Like there is no point killing myself over filtering dawg, we do what we need to do when we need to do dawg
    const { page, limit } = validationResult.data;
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;
    const whereClause = {
        isApproved: false,
        isDeleted: false,
    };
    const [blogs, totalCount] = await Promise.all([
        prisma_1.prisma.blog.findMany({
            where: whereClause,
            skip,
            take: limitNum,
            select: {
                id: true,
                sanityId: true,
                sanitySlug: true,
                publishedAt: true,
                createdAt: true,
                verifiedViewCount: true,
                genericViewCount: true,
                author: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                userName: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma_1.prisma.blog.count({ where: whereClause }),
    ]);
    // Transform data
    const transformedBlogs = blogs.map((blog) => ({
        id: blog.id,
        sanityId: blog.sanityId,
        sanitySlug: blog.sanitySlug,
        publishedAt: blog.publishedAt,
        createdAt: blog.createdAt,
        verifiedViewCount: blog.verifiedViewCount,
        genericViewCount: blog.genericViewCount,
        author: {
            id: blog.author.id,
            userName: blog.author.user.userName,
            firstName: blog.author.user.firstName,
            lastName: blog.author.user.lastName,
            email: blog.author.user.email,
        },
    }));
    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;
    const response = {
        blogs: transformedBlogs,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            totalPages,
            hasNext,
            hasPrev,
        },
    };
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        response,
        `Retrieved ${transformedBlogs.length} pending blog(s)`
    );
});
