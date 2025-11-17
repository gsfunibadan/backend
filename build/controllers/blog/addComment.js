"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addComment = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const addCommentSchema_1 = require("../../schemas/blogs/addCommentSchema");
const helpers_1 = require("../../utils/helpers");
exports.addComment = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required to comment", 401);
    }
    const validationResult = addCommentSchema_1.addCommentSchema.safeParse({
        ...req.params,
        ...req.body,
    });
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { content, blogId, parentId, replyingToUserId, replyingToUserName } =
        validationResult.data;
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
    // Flatten nested replies logic
    let finalParentId = parentId;
    let finalContent = content;
    if (parentId) {
        const parentComment = await prisma_1.prisma.comment.findUnique({
            where: { id: parentId },
            select: {
                id: true,
                parentId: true,
                isDeleted: true,
            },
        });
        if (!parentComment || parentComment.isDeleted) {
            throw new appError_1.AppError("Parent comment not found", 404);
        }
        // Flatten: if parent has a parent (it's a reply), use grandparent instead
        //I am only allowing 1 level deep of nested comments nha why
        if (parentComment.parentId) {
            finalParentId = parentComment.parentId;
        }
        // Add @mention if replying to someone (inspired by youtube)
        if (replyingToUserName) {
            finalContent = `@${replyingToUserName} ${content}`;
        }
    }
    // Create the comment
    const comment = await prisma_1.prisma.comment.create({
        data: {
            content: finalContent,
            blogId,
            userId,
            parentId: finalParentId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
            _count: {
                select: {
                    likes: true,
                },
            },
        },
    });
    // Get replyingTo user info if provided
    let replyingToUser = null;
    if (replyingToUserId) {
        const replyUser = await prisma_1.prisma.user.findUnique({
            where: { id: replyingToUserId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                isDeleted: true,
            },
        });
        if (replyUser && !replyUser.isDeleted) {
            replyingToUser = {
                id: replyUser.id,
                firstName: replyUser.firstName,
                lastName: replyUser.lastName,
            };
        }
    }
    // Transform for response
    const newComment = {
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
        isLiked: false,
        repliesCount: 0,
        parentId: finalParentId || null,
        replyingTo: replyingToUser,
        replies: [],
    };
    logger_1.logger.info("Comment added successfully", {
        userId,
        blogId,
        commentId: comment.id,
        isReply: !!finalParentId,
    });
    return (0, appResponse_1.AppResponse)(res, 201, newComment, "Comment added successfully");
});
