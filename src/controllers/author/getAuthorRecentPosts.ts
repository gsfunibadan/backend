import { Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { getAuthorRecentPostsSchema } from "../../schemas/author/getAuthorRecentPostsSchema";
import { AuthRequest } from "../../common/constants";

interface AuthorPostAnalytics {
    sanityId: string;
    sanitySlug: string;
    genericViewCount: number;
    verifiedViewCount: number;
    likesCount: number;
    commentsCount: number;
    publishedAt: Date | null;
}

interface PaginatedAuthorPostsAnalytics {
    posts: AuthorPostAnalytics[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        pageSize: number;
        hasMore: boolean;
        hasPrevious: boolean;
    };
}

export const getAuthorRecentPosts = catchAsync(async (req: AuthRequest, res: Response) => {
    const validationResult = getAuthorRecentPostsSchema.safeParse(req.query);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { page, limit } = validationResult.data;

    // Get userId from authenticated request
    const userId = req.user?.id;

    if (!userId) {
        throw new AppError("Authentication required", 401);
    }

    const author = await prisma.author.findUnique({
        where: { userId },
        select: {
            id: true,
            status: true,
            isDeleted: true,
            isSuspended: true,
        },
    });

    if (!author) {
        logger.warn("Posts requested by non-author user", { userId });
        throw new AppError("You are not registered as an author", 403, [
            { authorStatus: "Not an author" },
        ]);
    }

    // Check if author is deleted
    if (author.isDeleted) {
        logger.warn("Posts requested by deleted author", {
            userId,
            authorId: author.id,
        });
        throw new AppError("Author account is no longer active", 403, [
            { authorStatus: "Account deactivated" },
        ]);
    }

    // Check if author is suspended
    if (author.isSuspended) {
        logger.warn("Posts requested by suspended author", {
            userId,
            authorId: author.id,
        });
        throw new AppError("Your author account is currently suspended", 403, [
            { authorStatus: "Account suspended" },
        ]);
    }

    if (author.status !== "APPROVED") {
        logger.warn("Posts requested by non-approved author", {
            userId,
            authorId: author.id,
            status: author.status,
        });

        if (author.status === "PENDING") {
            throw new AppError("Your author application is still under review", 403, [
                { authorStatus: "Application pending" },
            ]);
        }

        if (author.status === "REJECTED") {
            throw new AppError("Your author application was rejected", 403, [
                { authorStatus: "Application rejected" },
            ]);
        }
    }

    const skip = (page - 1) * limit;

    // Get total count for pagination calculations
    const totalCount = await prisma.blog.count({
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
    const blogs = await prisma.blog.findMany({
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
    const posts: AuthorPostAnalytics[] = blogs.map((blog) => ({
        sanityId: blog.sanityId,
        sanitySlug: blog.sanitySlug,
        genericViewCount: blog.genericViewCount,
        verifiedViewCount: blog.verifiedViewCount,
        likesCount: blog._count.likes,
        commentsCount: blog._count.comments,
        publishedAt: blog.publishedAt,
    }));

    const response: PaginatedAuthorPostsAnalytics = {
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

    logger.info("Author recent posts fetched successfully", {
        userId,
        authorId: author.id,
        page,
        limit,
        totalCount,
        returnedCount: posts.length,
    });

    return AppResponse(res, 200, response, "Posts retrieved successfully");
});
