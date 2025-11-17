import { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { getBlogCommentsSchema } from "../../schemas/blogs/getBlogCommentsSchema";
import { timeAgo } from "../../utils/helpers";
import { AuthRequest } from "../../common/constants";

interface CommentAuthor {
    id: string;
    firstName: string;
    lastName: string;
    image?: string | null;
}

interface CommentReply {
    id: string;
    content: string;
    author: CommentAuthor;
    timeAgo: string;
    likesCount: number;
    isLiked: boolean;
    repliesCount: number;
    parentId: string;
    replyingTo: CommentAuthor | null;
    replies: never[];
}

interface Comment {
    id: string;
    content: string;
    author: CommentAuthor;
    timeAgo: string;
    likesCount: number;
    isLiked: boolean;
    repliesCount: number;
    parentId: string | null;
    replyingTo: CommentAuthor | null;
    replies: CommentReply[];
}

interface PaginatedCommentsResult {
    comments: Comment[];
    pagination: {
        hasMore: boolean;
        totalCount: number;
        totalPages: number;
        currentPage: number;
        pageSize: number;
    };
}

export const getBlogComments = catchAsync(async (req: Request | AuthRequest, res: Response) => {
    const validationResult = getBlogCommentsSchema.safeParse({
        blogId: req.params.blogId,
        ...req.query,
    });

    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { blogId, page, limit } = validationResult.data;
    const userId = (req as AuthRequest).user?.id; // Undefined if user not logged in

    // Check if blog exists
    const blog = await prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            isDeleted: true,
            isApproved: true,
        },
    });

    if (!blog || blog.isDeleted || !blog.isApproved) {
        throw new AppError("Blog not found", 404);
    }

    const skip = (page - 1) * limit;

    // Get total count of top-level comments
    const totalCount = await prisma.comment.count({
        where: {
            blogId,
            parentId: null,
            isDeleted: false,
        },
    });

    // Get paginated comments
    const comments = await prisma.comment.findMany({
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
        commentContent: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allReplies: any[]
    ): CommentAuthor | null => {
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

    const transformedComments: Comment[] = comments
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
            timeAgo: timeAgo(comment.createdAt),
            likesCount: comment._count.likes,
            isLiked: Array.isArray(comment.likes) ? comment.likes.length > 0 : false,
            repliesCount: comment._count.replies,
            parentId: null,
            replyingTo: null,
            replies: comment.replies
                .filter((reply) => !reply.user.isDeleted)
                .map((reply): CommentReply => {
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
                        timeAgo: timeAgo(reply.createdAt),
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

    const result: PaginatedCommentsResult = {
        comments: transformedComments,
        pagination: {
            hasMore,
            totalCount,
            totalPages,
            currentPage: page,
            pageSize: limit,
        },
    };

    logger.info("Blog comments fetched successfully", {
        blogId,
        page,
        limit,
        totalCount,
        returnedCount: transformedComments.length,
    });

    return AppResponse(res, 200, result, "Comments retrieved successfully");
});
