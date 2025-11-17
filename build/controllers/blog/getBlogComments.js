"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlogComments = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const getBlogCommentsSchema_1 = require("../../schemas/blogs/getBlogCommentsSchema");
const helpers_1 = require("../../utils/helpers");
exports.getBlogComments = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = getBlogCommentsSchema_1.getBlogCommentsSchema.safeParse({
        blogId: req.params.blogId,
        ...req.query,
    });
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { blogId, page, limit } = validationResult.data;
    const userId = req.user?.id; // Undefined if user not logged in
    // Check if blog exists
    const blog = await prisma_1.prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            isDeleted: true,
            isApproved: true,
        },
    });
    if (!blog || blog.isDeleted || !blog.isApproved) {
        throw new appError_1.AppError("Blog not found", 404);
    }
    const skip = (page - 1) * limit;
    // Get total count of top-level comments
    const totalCount = await prisma_1.prisma.comment.count({
        where: {
            blogId,
            parentId: null,
            isDeleted: false,
        },
    });
    // Get paginated comments
    const comments = await prisma_1.prisma.comment.findMany({
        where: {
            blogId,
            parentId: null, // Only top-level comments
            isDeleted: false,
        },
        skip,
        take: limit,
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    isDeleted: true,
                },
            },
            likes: userId
                ? {
                      where: { userId },
                      select: { userId: true },
                  }
                : false,
            _count: {
                select: {
                    likes: true,
                    replies: {
                        where: {
                            isDeleted: false,
                        },
                    },
                },
            },
            replies: {
                where: {
                    isDeleted: false,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            isDeleted: true,
                        },
                    },
                    likes: userId
                        ? {
                              where: { userId },
                              select: { userId: true },
                          }
                        : false,
                    _count: {
                        select: {
                            likes: true,
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
        orderBy: { createdAt: "desc" },
    });
    const getReplyingToUser = (
        commentContent,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allReplies
    ) => {
        const mentionMatch = commentContent.match(/@([\w\s]+)/);
        if (mentionMatch) {
            const fullName = mentionMatch[1].trim();
            const nameParts = fullName.split(" ");
            if (nameParts.length >= 2) {
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(" ");
                const replyTarget = allReplies.find(
                    (reply) =>
                        reply.user.firstName === firstName &&
                        reply.user.lastName === lastName &&
                        !reply.user.isDeleted
                );
                return replyTarget
                    ? {
                          id: replyTarget.user.id,
                          firstName: replyTarget.user.firstName,
                          lastName: replyTarget.user.lastName,
                      }
                    : null;
            }
        }
        return null;
    };
    const transformedComments = comments
        .filter((comment) => !comment.user.isDeleted) // Filter deleted users
        .map((comment) => ({
            id: comment.id,
            content: comment.content,
            author: {
                id: comment.user.id,
                firstName: comment.user.firstName,
                lastName: comment.user.lastName,
                image: null,
            },
            timeAgo: (0, helpers_1.timeAgo)(comment.createdAt),
            likesCount: comment._count.likes,
            isLiked: Array.isArray(comment.likes) ? comment.likes.length > 0 : false,
            repliesCount: comment._count.replies,
            parentId: null,
            replyingTo: null,
            replies: comment.replies
                .filter((reply) => !reply.user.isDeleted)
                .map((reply) => {
                    const replyingTo = getReplyingToUser(reply.content, comment.replies);
                    return {
                        id: reply.id,
                        content: reply.content,
                        author: {
                            id: reply.user.id,
                            firstName: reply.user.firstName,
                            lastName: reply.user.lastName,
                            image: null,
                        },
                        timeAgo: (0, helpers_1.timeAgo)(reply.createdAt),
                        likesCount: reply._count.likes,
                        isLiked: Array.isArray(reply.likes) ? reply.likes.length > 0 : false,
                        repliesCount: 0,
                        parentId: comment.id,
                        replyingTo,
                        replies: [],
                    };
                }),
        }));
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;
    const result = {
        comments: transformedComments,
        pagination: {
            hasMore,
            totalCount,
            totalPages,
            currentPage: page,
            pageSize: limit,
        },
    };
    logger_1.logger.info("Blog comments fetched successfully", {
        blogId,
        page,
        limit,
        totalCount,
        returnedCount: transformedComments.length,
    });
    return (0, appResponse_1.AppResponse)(res, 200, result, "Comments retrieved successfully");
});
