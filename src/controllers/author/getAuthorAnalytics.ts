import { Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { logger } from "../../utils/logger";

import { AuthRequest } from "../../common/constants";

interface AuthorAnalytics {
    totalPosts: number;
    totalLikes: number;
    totalVerifiedViews: number;
    totalGenericViews: number;
    authorInfo: {
        status: string;
        firstName: string;
        lastName: string;
        userName: string;
        email: string;
        authorBio: string;
        profilePicture: string | null;
        socials: Array<{
            id: string;
            platform: string;
            url: string;
            handle: string | null;
        }>;
    };
}

export const getAuthorAnalytics = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        throw new AppError("Authentication required", 401);
    }

    const author = await prisma.author.findUnique({
        where: {
            userId,
        },
        select: {
            id: true,
            status: true,
            isDeleted: true,
            isSuspended: true,
            sanityDocumentId: true,
            profilePicture: true,
            authorBio: true,
            socials: {
                select: {
                    id: true,
                    platform: true,
                    url: true,
                    handle: true,
                },
            },
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    userName: true,
                    email: true,
                    isDeleted: true,
                },
            },
            blogs: {
                where: {
                    isApproved: true,
                    isDeleted: false,
                },
                select: {
                    id: true,
                    genericViewCount: true,
                    _count: {
                        select: {
                            likes: true,
                            reads: true,
                        },
                    },
                },
            },
        },
    });

    // User is not an author
    if (!author) {
        logger.warn("Analytics requested by non-author user", {
            userId,
        });
        throw new AppError("You are not registered as an author", 403, [
            { authorStatus: "Not an author" },
        ]);
    }

    // Check if author is deleted (soft delete)
    if (author.isDeleted) {
        logger.warn("Analytics requested by deleted author", {
            userId,
            authorId: author.id,
        });
        throw new AppError("Author account is no longer active", 403, [
            { authorStatus: "Account deactivated" },
        ]);
    }

    // Check if author is suspended
    if (author.isSuspended) {
        logger.warn("Analytics requested by suspended author", {
            userId,
            authorId: author.id,
        });
        throw new AppError("Your author account is currently suspended", 403, [
            { authorStatus: "Account suspended" },
        ]);
    }

    // Check if author is approved
    if (author.status !== "APPROVED") {
        logger.warn("Analytics requested by non-approved author", {
            userId,
            authorId: author.id,
            status: author.status,
        });

        // Different message based on status
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

    // Check if user is deleted
    if (author.user.isDeleted) {
        logger.error("Author with deleted user found in analytics", {
            userId,
            authorId: author.id,
        });
        throw new AppError("User account not found", 404);
    }

    const totalPosts = author.blogs.length;

    const totalLikes = author.blogs.reduce((sum, blog) => sum + blog._count.likes, 0);

    const totalVerifiedViews = author.blogs.reduce((sum, blog) => sum + blog._count.reads, 0);

    const totalGenericViews = author.blogs.reduce((sum, blog) => sum + blog.genericViewCount, 0);

    const analytics: AuthorAnalytics = {
        totalPosts,
        totalLikes,
        totalVerifiedViews,
        totalGenericViews,
        authorInfo: {
            status: author.status,
            firstName: author.user.firstName,
            lastName: author.user.lastName,
            userName: author.user.userName,
            email: author.user.email,
            profilePicture: author.profilePicture || null,
            authorBio: author.authorBio,
            socials: author.socials,
        },
    };

    logger.info("Author analytics fetched successfully", {
        userId,
        authorId: author.id,
        totalPosts,
        totalLikes,
        hasprofilePicture: !!author.profilePicture,
    });

    return AppResponse(res, 200, analytics, "Analytics retrieved successfully");
});