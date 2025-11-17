"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthorRecentPosts = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const getAuthorRecentPostsSchema_1 = require("../../schemas/author/getAuthorRecentPostsSchema");
exports.getAuthorRecentPosts = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = getAuthorRecentPostsSchema_1.getAuthorRecentPostsSchema.safeParse(
        req.query
    );
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { page, limit } = validationResult.data;
    // Get userId from authenticated request
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required", 401);
    }
    const author = await prisma_1.prisma.author.findUnique({
        where: { userId },
        select: {
            id: true,
            status: true,
            isDeleted: true,
            isSuspended: true,
        },
    });
    if (!author) {
        logger_1.logger.warn("Posts requested by non-author user", { userId });
        throw new appError_1.AppError("You are not registered as an author", 403, [
            { authorStatus: "Not an author" },
        ]);
    }
    // Check if author is deleted
    if (author.isDeleted) {
        logger_1.logger.warn("Posts requested by deleted author", {
            userId,
            authorId: author.id,
        });
        throw new appError_1.AppError("Author account is no longer active", 403, [
            { authorStatus: "Account deactivated" },
        ]);
    }
    // Check if author is suspended
    if (author.isSuspended) {
        logger_1.logger.warn("Posts requested by suspended author", {
            userId,
            authorId: author.id,
        });
        throw new appError_1.AppError("Your author account is currently suspended", 403, [
            { authorStatus: "Account suspended" },
        ]);
    }
    if (author.status !== "APPROVED") {
        logger_1.logger.warn("Posts requested by non-approved author", {
            userId,
            authorId: author.id,
            status: author.status,
        });
        if (author.status === "PENDING") {
            throw new appError_1.AppError("Your author application is still under review", 403, [
                { authorStatus: "Application pending" },
            ]);
        }
        if (author.status === "REJECTED") {
            throw new appError_1.AppError("Your author application was rejected", 403, [
                { authorStatus: "Application rejected" },
            ]);
        }
    }
    const skip = (page - 1) * limit;
    // Get total count for pagination calculations
    const totalCount = await prisma_1.prisma.blog.count({
        where: {
            authorId: author.id,
            isApproved: true,
            isDeleted: false, // Only count active blogs
        },
    });
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;
    const hasPrevious = page > 1;
    // Get paginated blog analytics
    const blogs = await prisma_1.prisma.blog.findMany({
        where: {
            authorId: author.id,
            isApproved: true,
            isDeleted: false,
        },
        select: {
            sanityId: true,
            sanitySlug: true,
            genericViewCount: true,
            verifiedViewCount: true,
            publishedAt: true,
            _count: {
                select: {
                    likes: true,
                    comments: {
                        where: {
                            isDeleted: false, // Only count active comments
                        },
                    },
                },
            },
        },
        orderBy: [
            {
                publishedAt: "desc", // Most recent first
            },
            {
                createdAt: "desc", // Fallback if publishedAt is null
            },
        ],
        skip,
        take: limit,
    });
    // Transform data to match expected format for the UI
    const posts = blogs.map((blog) => ({
        sanityId: blog.sanityId,
        sanitySlug: blog.sanitySlug,
        genericViewCount: blog.genericViewCount,
        verifiedViewCount: blog.verifiedViewCount,
        likesCount: blog._count.likes,
        commentsCount: blog._count.comments,
        publishedAt: blog.publishedAt,
    }));
    const response = {
        posts,
        pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            pageSize: limit,
            hasMore,
            hasPrevious,
        },
    };
    logger_1.logger.info("Author recent posts fetched successfully", {
        userId,
        authorId: author.id,
        page,
        limit,
        totalCount,
        returnedCount: posts.length,
    });
    return (0, appResponse_1.AppResponse)(res, 200, response, "Posts retrieved successfully");
});
