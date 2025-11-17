import { Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { AuthRequest } from "../../common/constants";
import { addCommentSchema } from "../../schemas/blogs/addCommentSchema";
import { timeAgo } from "../../utils/helpers";

interface CommentAuthor {
    id: string;
    firstName: string;
    lastName: string;
    image?: string | null;
}

interface NewComment {
    id: string;
    content: string;
    author: CommentAuthor;
    timeAgo: string;
    likesCount: number;
    isLiked: boolean;
    repliesCount: number;
    parentId: string | null;
    replyingTo: CommentAuthor | null;
    replies: never[];
}

export const addComment = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AppError("Authentication required to comment", 401);
    }

    const validationResult = addCommentSchema.safeParse({
        ...req.params,
        ...req.body,
    });
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { content, blogId, parentId, replyingToUserId, replyingToUserName } =
        validationResult.data;

    const blog = await prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            sanitySlug: true,
            isDeleted: true,
            isApproved: true,
        },
    });

    if (!blog || blog.isDeleted || !blog.isApproved) {
        throw new AppError("Blog not found", 404);
    }

    // Flatten nested replies logic
    let finalParentId = parentId;
    let finalContent = content;

    if (parentId) {
        const parentComment = await prisma.comment.findUnique({
            where: { id: parentId },
            select: {
                id: true,
                parentId: true,
                isDeleted: true,
            },
        });

        if (!parentComment || parentComment.isDeleted) {
            throw new AppError("Parent comment not found", 404);
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
    const comment = await prisma.comment.create({
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
    let replyingToUser: CommentAuthor | null = null;
    if (replyingToUserId) {
        const replyUser = await prisma.user.findUnique({
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
    const newComment: NewComment = {
        id: comment.id,
        content: comment.content,
        author: {
            id: comment.user.id,
            firstName: comment.user.firstName,
            lastName: comment.user.lastName,
            image: null,
        },
        timeAgo: timeAgo(comment.createdAt),
        likesCount: comment._count.likes,
        isLiked: false,
        repliesCount: 0,
        parentId: finalParentId || null,
        replyingTo: replyingToUser,
        replies: [],
    };

    logger.info("Comment added successfully", {
        userId,
        blogId,
        commentId: comment.id,
        isReply: !!finalParentId,
    });

    return AppResponse(res, 201, newComment, "Comment added successfully");
});
