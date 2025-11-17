"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const appResponse_1 = require("../../utils/appResponse");
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const getUsersSchema_1 = require("../../schemas/admin/getUsersSchema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
exports.getUsers = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.admin) {
        throw new appError_1.AppError("Admin Permission is Required to perform this action");
    }
    const validationResult = getUsersSchema_1.getUsersSchema.safeParse(req.query);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { page, limit, search, sortBy, sortOrder, isVerified, isDeleted, authProvider, role } =
        validationResult.data;
    const skip = (page - 1) * limit;
    const whereClause = {
        isDeleted,
    };
    if (isVerified !== undefined) {
        whereClause.isVerified = isVerified;
    }
    // Filter by auth provider, don't think we finna be needing to do this though
    if (authProvider) {
        whereClause.authProvider = authProvider;
    }
    // Filter by role (user, author, or admin)
    if (role === "author") {
        whereClause.author = { isNot: null };
    } else if (role === "admin") {
        whereClause.admin = { isNot: null };
    } else if (role === "user") {
        whereClause.author = null;
        whereClause.admin = null;
    }
    if (search) {
        whereClause.OR = [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { userName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
        ];
    }
    const [users, totalCount] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            select: {
                id: true,
                email: true,
                userName: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                bio: true,
                authProvider: true,
                isVerified: true,
                isDeleted: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true,
                // Check if user is an author
                author: {
                    select: {
                        id: true,
                        status: true,
                        isSuspended: true,
                        isDeleted: true,
                        _count: {
                            select: { blogs: true },
                        },
                    },
                },
                // Check if user is an admin
                admin: {
                    select: {
                        id: true,
                        isActive: true,
                        isSuspended: true,
                        isDeleted: true,
                    },
                },
                // Engagement stats
                _count: {
                    select: {
                        comments: true,
                        blogLikes: true,
                        commentLikes: true,
                        blogReads: true,
                    },
                },
            },
        }),
        prisma_1.prisma.user.count({ where: whereClause }),
    ]);
    // Transform data for response
    const transformedUsers = users.map((user) => {
        // Determine user role(s)
        const roles = ["user"];
        if (user.author && !user.author.isDeleted) {
            roles.push("author");
        }
        if (user.admin && !user.admin.isDeleted) {
            roles.push("admin");
        }
        return {
            id: user.id,
            email: user.email,
            userName: user.userName,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            bio: user.bio,
            authProvider: user.authProvider,
            isVerified: user.isVerified,
            isDeleted: user.isDeleted,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            deletedAt: user.deletedAt,
            roles,
            // Author info (if applicable)
            authorInfo: user.author
                ? {
                      id: user.author.id,
                      status: user.author.status,
                      isSuspended: user.author.isSuspended,
                      blogCount: user.author._count.blogs,
                  }
                : null,
            // Admin info (if applicable)
            adminInfo: user.admin
                ? {
                      id: user.admin.id,
                      isActive: user.admin.isActive,
                      isSuspended: user.admin.isSuspended,
                  }
                : null,
            // Engagement stats
            engagement: {
                comments: user._count.comments,
                blogLikes: user._count.blogLikes,
                commentLikes: user._count.commentLikes,
                blogReads: user._count.blogReads,
            },
        };
    });
    const totalPages = Math.ceil(totalCount / limit);
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        {
            users: transformedUsers,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        },
        `Retrieved ${transformedUsers.length} user(s)`
    );
});
