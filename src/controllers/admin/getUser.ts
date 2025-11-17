import { Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppResponse } from "../../utils/appResponse";
import { prisma } from "../../database/prisma";
import { AuthRequest } from "../../common/constants";
import { AppError } from "../../utils/appError";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { getUserSchema } from "../../schemas/admin/getUserSchema";

export const getUser = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.admin) {
        throw new AppError("Admin authentication required");
    }

    const validationResult = getUserSchema.safeParse(req.params);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { userId } = validationResult.data;
    // Fetch user with all related data
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            userName: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            bio: true,
            authProvider: true,
            googleId: true,
            isVerified: true,
            isDeleted: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            // Author details
            author: {
                select: {
                    id: true,
                    authorBio: true,
                    profilePicture: true,
                    status: true,
                    appliedAt: true,
                    approvedAt: true,
                    rejectedAt: true,
                    rejectionReason: true,
                    isSuspended: true,
                    isDeleted: true,
                    socials: {
                        select: {
                            platform: true,
                            url: true,
                            handle: true,
                        },
                    },
                    blogs: {
                        where: { isDeleted: false },
                        select: {
                            id: true,
                            sanitySlug: true,
                            isApproved: true,
                            publishedAt: true,
                            verifiedViewCount: true,
                            genericViewCount: true,
                            approvedBy: true,
                            _count: {
                                select: {
                                    likes: true,
                                    comments: true,
                                },
                            },
                        },
                        orderBy: { createdAt: "desc" },
                        take: 10, // Last 10 blogs
                    },
                    _count: {
                        select: { blogs: true },
                    },
                },
            },
            // Admin details
            admin: {
                select: {
                    id: true,
                    invitedAt: true,
                    isActive: true,
                    isSuspended: true,
                    suspendedAt: true,
                    suspensionReason: true,
                    lastActiveAt: true,
                    isDeleted: true,
                    inviter: {
                        select: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    userName: true,
                                },
                            },
                        },
                    },
                },
            },
            // Recent comments
            comments: {
                where: { isDeleted: false },
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    blog: {
                        select: {
                            sanitySlug: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            },
            // Engagement counts
            _count: {
                select: {
                    comments: true,
                    blogLikes: true,
                    commentLikes: true,
                    blogReads: true,
                    sessions: true,
                },
            },
        },
    });

    if (!user) {
        return AppResponse(res, 404, null, "User not found");
    }

    const userDetails = {
        id: user.id,
        email: user.email,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        authProvider: user.authProvider,
        googleId: user.googleId,
        isVerified: user.isVerified,
        isDeleted: user.isDeleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt,

        author: user.author
            ? {
                  id: user.author.id,
                  bio: user.author.authorBio,
                  profilePicture: user.author.profilePicture,
                  status: user.author.status,
                  appliedAt: user.author.appliedAt,
                  approvedAt: user.author.approvedAt,
                  rejectedAt: user.author.rejectedAt,
                  rejectionReason: user.author.rejectionReason,
                  isSuspended: user.author.isSuspended,
                  socials: user.author.socials,
                  totalBlogs: user.author._count.blogs,
                  recentBlogs: user.author.blogs.map((blog) => ({
                      id: blog.id,
                      slug: blog.sanitySlug,
                      published: blog.isApproved,
                      publishedAt: blog.publishedAt,
                      views: blog.verifiedViewCount,
                      likes: blog._count.likes,
                      comments: blog._count.comments,
                      isApproved: blog.approvedBy !== null,
                  })),
              }
            : null,
        // Admin section
        admin: user.admin
            ? {
                  id: user.admin.id,
                  invitedAt: user.admin.invitedAt,
                  isActive: user.admin.isActive,
                  isSuspended: user.admin.isSuspended,
                  suspendedAt: user.admin.suspendedAt,
                  suspensionReason: user.admin.suspensionReason,
                  lastActiveAt: user.admin.lastActiveAt,
                  invitedBy: user.admin.inviter
                      ? `${user.admin.inviter.user.firstName} ${user.admin.inviter.user.lastName}`
                      : null,
              }
            : null,
        // Activity section
        activity: {
            recentComments: user.comments.map((comment) => ({
                id: comment.id,
                content:
                    comment.content.length > 100
                        ? comment.content.substring(0, 100) + "..."
                        : comment.content,
                createdAt: comment.createdAt,
                blogSlug: comment.blog.sanitySlug,
            })),
            totalComments: user._count.comments,
            totalBlogLikes: user._count.blogLikes,
            totalCommentLikes: user._count.commentLikes,
            totalBlogReads: user._count.blogReads,
            totalSessions: user._count.sessions,
        },
    };

    return AppResponse(res, 200, { user: userDetails }, "User details retrieved successfully");
});
