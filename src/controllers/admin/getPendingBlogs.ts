import { Response } from "express";
import { AuthRequest } from "../../common/constants";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { getPendingBlogsSchema } from "../../schemas/admin/getPendingBlogsSchema";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { prisma } from "../../database/prisma";
import { AppResponse } from "../../utils/appResponse";

interface PendingBlog {
    id: string;
    sanityId: string;
    sanitySlug: string;
    publishedAt: Date | null;
    createdAt: Date;
    verifiedViewCount: number;
    genericViewCount: number;
    author: {
        id: string;
        userName: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface PendingBlogsResponse {
    blogs: PendingBlog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export const getPendingBlogs = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.admin) {
        throw new AppError("Admin authentication required", 401);
    }

    const validationResult = getPendingBlogsSchema.safeParse(req.query);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
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
        prisma.blog.findMany({
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
        prisma.blog.count({ where: whereClause }),
    ]);

    // Transform data
    const transformedBlogs: PendingBlog[] = blogs.map((blog) => ({
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

    const response: PendingBlogsResponse = {
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

    return AppResponse(res, 200, response, `Retrieved ${transformedBlogs.length} pending blog(s)`);
});
