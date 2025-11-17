import { Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppResponse } from "../../utils/appResponse";
import { prisma } from "../../database/prisma";
import { AuthRequest } from "../../common/constants";
import { AppError } from "../../utils/appError";

export const getDashboardStats = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.admin) {
        throw new AppError("Admin authentication required", 401);
    }
    const [
        totalUsers,
        verifiedUsers,
        unverifiedUsers,
        deletedUsers,
        usersLast30Days,
        usersLast7Days,
        usersByProvider,

        // Author metrics
        totalAuthors,
        pendingAuthors,
        approvedAuthors,
        rejectedAuthors,
        suspendedAuthors,
        authorsLast30Days,

        // Blog metrics
        totalBlogs,
        publishedBlogs,
        unpublishedBlogs,
        approvedBlogs,
        unapprovedBlogs,
        pendingApprovalBlogs,
        deletedBlogs,
        blogsLast30Days,
        blogsLast7Days,

        // Engagement metrics
        totalComments,
        totalBlogLikes,
        totalCommentLikes,
        totalBlogReads,
        deletedComments,

        // Admin metrics
        totalAdmins,
        activeAdmins,

        // Top content queries
        topBlogsByViews,
        topBlogsByLikes,
        topAuthorsByBlogs,

        // Recent activity
        recentComments,
    ] = await Promise.all([
        // === USER QUERIES ===
        prisma.user.count(),
        prisma.user.count({ where: { isVerified: true, isDeleted: false } }),
        prisma.user.count({ where: { isVerified: false, isDeleted: false } }),
        prisma.user.count({ where: { isDeleted: true } }),
        prisma.user.count({
            where: {
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                isDeleted: false,
            },
        }),
        prisma.user.count({
            where: {
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                isDeleted: false,
            },
        }),
        prisma.user.groupBy({
            by: ["authProvider"],
            _count: true,
            where: { isDeleted: false },
        }),

        prisma.author.count(),
        prisma.author.count({ where: { status: "PENDING", isDeleted: false } }),
        prisma.author.count({ where: { status: "APPROVED", isDeleted: false } }),
        prisma.author.count({ where: { status: "REJECTED", isDeleted: false } }),
        prisma.author.count({ where: { isSuspended: true, isDeleted: false } }),
        prisma.author.count({
            where: {
                appliedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                isDeleted: false,
            },
        }),

        prisma.blog.count(),
        prisma.blog.count({
            where: { isApproved: true, isDeleted: false },
        }),
        prisma.blog.count({
            where: { isApproved: false, isDeleted: false },
        }),

        prisma.blog.count({
            where: {
                approvedBy: { not: null },
                isDeleted: false,
            },
        }),

        prisma.blog.count({
            where: {
                approvedBy: null,
                lastUnapprovedBy: { not: null },
                isDeleted: false,
            },
        }),

        prisma.blog.count({
            where: {
                approvedBy: null,
                lastUnapprovedBy: null,
                isDeleted: false,
            },
        }),
        prisma.blog.count({ where: { isDeleted: true } }),
        prisma.blog.count({
            where: {
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                isDeleted: false,
            },
        }),
        prisma.blog.count({
            where: {
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                isDeleted: false,
            },
        }),

        // === ENGAGEMENT QUERIES ===
        prisma.comment.count(),
        prisma.blogLike.count(),
        prisma.commentLike.count(),
        prisma.blogRead.count(),
        prisma.comment.count({ where: { isDeleted: true } }),

        // === ADMIN QUERIES ===
        prisma.admin.count(),
        prisma.admin.count({
            where: {
                isActive: true,
                isSuspended: false,
                isDeleted: false,
            },
        }),

        // === TOP CONTENT QUERIES ===
        prisma.blog.findMany({
            where: {
                isApproved: true,
                isDeleted: false,
                approvedBy: { not: null }, // Only approved blogs
            },
            select: {
                id: true,
                sanitySlug: true,
                verifiedViewCount: true,
                genericViewCount: true,
                author: {
                    select: {
                        user: {
                            select: { userName: true, firstName: true, lastName: true },
                        },
                    },
                },
            },
            orderBy: { verifiedViewCount: "desc" },
            take: 5,
        }),

        prisma.blog.findMany({
            where: {
                isApproved: true,
                isDeleted: false,
                approvedBy: { not: null }, // Only approved blogs
            },
            select: {
                id: true,
                sanitySlug: true,
                _count: { select: { likes: true } },
                author: {
                    select: {
                        user: {
                            select: { userName: true, firstName: true, lastName: true },
                        },
                    },
                },
            },
            orderBy: { likes: { _count: "desc" } },
            take: 5,
        }),

        prisma.author.findMany({
            where: { status: "APPROVED", isDeleted: false },
            select: {
                id: true,
                user: {
                    select: { userName: true, firstName: true, lastName: true },
                },
                _count: { select: { blogs: true } },
            },
            orderBy: { blogs: { _count: "desc" } },
            take: 5,
        }),

        // === RECENT ACTIVITY ===
        prisma.comment.findMany({
            where: { isDeleted: false },
            select: {
                id: true,
                content: true,
                createdAt: true,
                user: {
                    select: { userName: true },
                },
                blog: {
                    select: { sanitySlug: true },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        }),
    ]);

    // Calculate growth rates
    const userGrowthRate = totalUsers > 0 ? ((usersLast30Days / totalUsers) * 100).toFixed(1) : "0";
    const blogGrowthRate = totalBlogs > 0 ? ((blogsLast30Days / totalBlogs) * 100).toFixed(1) : "0";

    // Format response
    return AppResponse(
        res,
        200,
        {
            overview: {
                users: {
                    total: totalUsers,
                    verified: verifiedUsers,
                    unverified: unverifiedUsers,
                    deleted: deletedUsers,
                    last30Days: usersLast30Days,
                    last7Days: usersLast7Days,
                    growthRate: `${userGrowthRate}%`,
                    byProvider: usersByProvider.map((p) => ({
                        provider: p.authProvider,
                        count: p._count,
                    })),
                },
                authors: {
                    total: totalAuthors,
                    pending: pendingAuthors,
                    approved: approvedAuthors,
                    rejected: rejectedAuthors,
                    suspended: suspendedAuthors,
                    last30Days: authorsLast30Days,
                },
                blogs: {
                    total: totalBlogs,
                    published: publishedBlogs,
                    unpublished: unpublishedBlogs,
                    approved: approvedBlogs,
                    unapproved: unapprovedBlogs,
                    pendingApproval: pendingApprovalBlogs,
                    deleted: deletedBlogs,
                    last30Days: blogsLast30Days,
                    last7Days: blogsLast7Days,
                    growthRate: `${blogGrowthRate}%`,
                },
                engagement: {
                    totalComments,
                    totalBlogLikes,
                    totalCommentLikes,
                    totalBlogReads,
                    deletedComments,
                    avgLikesPerBlog:
                        totalBlogs > 0 ? (totalBlogLikes / totalBlogs).toFixed(2) : "0",
                    avgReadsPerBlog:
                        totalBlogs > 0 ? (totalBlogReads / totalBlogs).toFixed(2) : "0",
                },
                admins: {
                    total: totalAdmins,
                    active: activeAdmins,
                },
            },
            topContent: {
                blogsByViews: topBlogsByViews.map((blog) => ({
                    id: blog.id,
                    slug: blog.sanitySlug,
                    views: blog.verifiedViewCount,
                    genericViews: blog.genericViewCount,
                    author: `${blog.author.user.firstName} ${blog.author.user.lastName}`,
                    authorUsername: blog.author.user.userName,
                })),
                blogsByLikes: topBlogsByLikes.map((blog) => ({
                    id: blog.id,
                    slug: blog.sanitySlug,
                    likes: blog._count.likes,
                    author: `${blog.author.user.firstName} ${blog.author.user.lastName}`,
                    authorUsername: blog.author.user.userName,
                })),
                topAuthors: topAuthorsByBlogs.map((author) => ({
                    id: author.id,
                    name: `${author.user.firstName} ${author.user.lastName}`,
                    username: author.user.userName,
                    blogCount: author._count.blogs,
                })),
            },
            recentActivity: {
                comments: recentComments.map((comment) => ({
                    id: comment.id,
                    content:
                        comment.content.length > 100
                            ? comment.content.substring(0, 100) + "..."
                            : comment.content,
                    user: comment.user.userName,
                    blog: comment.blog.sanitySlug,
                    createdAt: comment.createdAt,
                })),
            },
        },
        "Dashboard statistics retrieved successfully"
    );
});
