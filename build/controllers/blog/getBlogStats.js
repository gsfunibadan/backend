"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlogStats = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const getBlogStatsSchema_1 = require("../../schemas/blogs/getBlogStatsSchema");
exports.getBlogStats = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = getBlogStatsSchema_1.getBlogStatsSchema.safeParse({
        blogId: req.params.blogId,
    });
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { blogId } = validationResult.data;
    const userId = req.user?.id;
    // Check if blog exists and get blog details with author
    const blog = await prisma_1.prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            sanityId: true,
            sanitySlug: true,
            publishedAt: true,
            isDeleted: true,
            isApproved: true,
            genericViewCount: true,
            author: {
                select: {
                    id: true,
                    authorBio: true,
                    profilePicture: true,
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            userName: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });
    if (!blog || blog.isDeleted || !blog.isApproved) {
        throw new appError_1.AppError("Blog not found", 404);
    }
    const [likesCount, commentsCount, userLike] = await Promise.all([
        prisma_1.prisma.blogLike.count({
            where: { blogId },
        }),
        // Count top-level comments only
        prisma_1.prisma.comment.count({
            where: {
                blogId,
                parentId: null,
                isDeleted: false,
            },
        }),
        // Check if current user liked this blog (only if logged in, e get why sha)
        userId
            ? prisma_1.prisma.blogLike.findUnique({
                  where: {
                      userId_blogId: {
                          userId,
                          blogId,
                      },
                  },
              })
            : null,
    ]);
    const stats = {
        id: blog.id,
        sanityId: blog.sanityId,
        sanitySlug: blog.sanitySlug,
        publishedAt: blog.publishedAt,
        likesCount,
        viewsCount: blog.genericViewCount,
        commentsCount,
        isLiked: !!userLike,
        author: {
            authorBio: blog.author.authorBio,
            profilePicture: blog.author.profilePicture,
            user: {
                firstName: blog.author.user.firstName,
                lastName: blog.author.user.userName,
                userName: blog.author.user.userName,
                email: blog.author.user.email,
            },
        },
    };
    logger_1.logger.info("Blog stats fetched successfully", {
        blogId,
        userId: userId || "guest",
    });
    return (0, appResponse_1.AppResponse)(res, 200, stats, "Blog stats retrieved successfully");
});
