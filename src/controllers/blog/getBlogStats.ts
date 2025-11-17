import { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { getBlogStatsSchema } from "../../schemas/blogs/getBlogStatsSchema";
import { AuthRequest } from "../../common/constants";

interface BlogStats {
    id: string;
    sanityId: string;
    sanitySlug: string;
    publishedAt: Date | null;
    likesCount: number;
    viewsCount: number;
    commentsCount: number;
    isLiked: boolean;
    author: {
        authorBio: string | null;
        profilePicture: string;
        user: {
            firstName: string;
            lastName: string;
            userName: string;
            email: string;
        };
    };
}

export const getBlogStats = catchAsync(async (req: Request | AuthRequest, res: Response) => {
    const validationResult = getBlogStatsSchema.safeParse({
        blogId: req.params.blogId,
    });

    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { blogId } = validationResult.data;
    const userId = (req as AuthRequest).user?.id;

    // Check if blog exists and get blog details with author
    const blog = await prisma.blog.findUnique({
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
        throw new AppError("Blog not found", 404);
    }

    const [likesCount, commentsCount, userLike] = await Promise.all([
        prisma.blogLike.count({
            where: { blogId },
        }),

        // Count top-level comments only
        prisma.comment.count({
            where: {
                blogId,
                parentId: null,
                isDeleted: false,
            },
        }),

        // Check if current user liked this blog (only if logged in, e get why sha)
        userId
            ? prisma.blogLike.findUnique({
                  where: {
                      userId_blogId: {
                          userId,
                          blogId,
                      },
                  },
              })
            : null,
    ]);

    const stats: BlogStats = {
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

    logger.info("Blog stats fetched successfully", {
        blogId,
        userId: userId || "guest",
    });

    return AppResponse(res, 200, stats, "Blog stats retrieved successfully");
});
