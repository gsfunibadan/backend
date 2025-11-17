import { Response } from "express";
import { AuthRequest } from "../../common/constants";
import { catchAsync } from "../../utils/catchAsync";
import { getAuthorSchema } from "../../schemas/admin/getAuthorSchema";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";
import { prisma } from "../../database/prisma";
import { AppResponse } from "../../utils/appResponse";

export const getAuthor = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.admin) {
        throw new AppError("Admin authentication required", 403);
    }

    const validationResult = getAuthorSchema.safeParse(req.params);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Invalid author ID", 400, formattedErrors);
    }

    const { authorId } = validationResult.data;

    const author = await prisma.author.findUnique({
        where: { id: authorId },
        select: {
            id: true,
            userId: true,
            authorBio: true,
            profilePicture: true,
            sanityDocumentId: true,
            status: true,
            appliedAt: true,
            approvedAt: true,
            rejectedAt: true,
            rejectionReason: true,
            reviewedBy: true,
            reviewedAt: true,
            isSuspended: true,
            isDeleted: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true,
            // User details
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    userName: true,
                    email: true,
                    phoneNumber: true,
                    bio: true,
                    authProvider: true,
                    isVerified: true,
                    isDeleted: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
            // Social links
            socials: {
                select: {
                    id: true,
                    platform: true,
                    url: true,
                    handle: true,
                },
            },
            // Blogs statistics
            _count: {
                select: {
                    blogs: true,
                },
            },
            blogs: {
                where: {
                    isDeleted: false,
                },
                select: {
                    id: true,
                    sanityId: true,
                    sanitySlug: true,
                    isApproved: true,
                    publishedAt: true,
                    genericViewCount: true,
                    verifiedViewCount: true,
                    createdAt: true,
                    _count: {
                        select: {
                            likes: true,
                            comments: {
                                where: { isDeleted: false },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 10, // Latest 10 blogs
            },
        },
    });

    if (!author) {
        throw new AppError("Author not found", 404);
    }

    // 4. Format response with detailed information
    const response = {
        id: author.id,
        userId: author.userId,
        authorBio: author.authorBio,
        profilePicture: author.profilePicture,
        sanityDocumentId: author.sanityDocumentId,
        status: author.status,
        isSuspended: author.isSuspended,
        isDeleted: author.isDeleted,

        // Dates
        appliedAt: author.appliedAt,
        approvedAt: author.approvedAt,
        rejectedAt: author.rejectedAt,
        reviewedAt: author.reviewedAt,
        deletedAt: author.deletedAt,
        createdAt: author.createdAt,
        updatedAt: author.updatedAt,

        // Review info
        rejectionReason: author.rejectionReason,
        reviewedBy: author.reviewedBy,

        // User information
        user: {
            id: author.user.id,
            firstName: author.user.firstName,
            lastName: author.user.lastName,
            fullName: `${author.user.firstName} ${author.user.lastName}`,
            userName: author.user.userName,
            email: author.user.email,
            phoneNumber: author.user.phoneNumber,
            bio: author.user.bio,
            authProvider: author.user.authProvider,
            isVerified: author.user.isVerified,
            isDeleted: author.user.isDeleted,
            createdAt: author.user.createdAt,
            updatedAt: author.user.updatedAt,
        },

        // Social links
        socials: author.socials,

        // Blog statistics
        statistics: {
            totalBlogs: author._count.blogs,
            approvedBlogs: author.blogs.filter((b) => b.isApproved).length,
            pendingBlogs: author.blogs.filter((b) => !b.isApproved).length,
            totalViews: author.blogs.reduce((sum, blog) => sum + blog.verifiedViewCount, 0),
            totalLikes: author.blogs.reduce((sum, blog) => sum + blog._count.likes, 0),
            totalComments: author.blogs.reduce((sum, blog) => sum + blog._count.comments, 0),
        },

        // Recent blogs
        recentBlogs: author.blogs.map((blog) => ({
            id: blog.id,
            sanityId: blog.sanityId,
            sanitySlug: blog.sanitySlug,
            isApproved: blog.isApproved,
            publishedAt: blog.publishedAt,
            views: blog.verifiedViewCount,
            likes: blog._count.likes,
            comments: blog._count.comments,
            createdAt: blog.createdAt,
        })),
    };

    return AppResponse(res, 200, { author: response }, "Author details retrieved successfully");
});
