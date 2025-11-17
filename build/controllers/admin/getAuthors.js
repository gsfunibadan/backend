"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthors = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const getAuthorsSchema_1 = require("../../schemas/admin/getAuthorsSchema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
const prisma_1 = require("../../database/prisma");
const appResponse_1 = require("../../utils/appResponse");
exports.getAuthors = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.admin) {
        throw new appError_1.AppError("Admin authentication required", 403);
    }
    const validationResult = getAuthorsSchema_1.getAuthorsSchema.safeParse(req.query);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Invalid query parameters", 400, formattedErrors);
    }
    const {
        page,
        limit,
        search,
        status,
        isSuspended,
        isDeleted,
        sortBy,
        sortOrder,
        appliedAfter,
        appliedBefore,
    } = validationResult.data;
    const skip = (page - 1) * limit;
    const whereClause = {
        isDeleted,
        ...(status && { status }),
        ...(isSuspended !== undefined && { isSuspended }),
        ...(search && {
            OR: [
                {
                    user: {
                        firstName: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    user: {
                        lastName: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    user: {
                        userName: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    user: {
                        email: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
            ],
        }),
        ...(appliedAfter || appliedBefore
            ? {
                  appliedAt: {
                      ...(appliedAfter && { gte: appliedAfter }),
                      ...(appliedBefore && { lte: appliedBefore }),
                  },
              }
            : {}),
    };
    // 4. Build orderBy clause
    let orderBy;
    if (sortBy === "userName" || sortBy === "email") {
        // Sorting by user fields
        orderBy = {
            user: {
                [sortBy]: sortOrder,
            },
        };
    } else {
        // Sorting by author fields
        orderBy = {
            [sortBy]: sortOrder,
        };
    }
    // 5. Fetch authors with pagination
    const [authors, totalCount] = await Promise.all([
        prisma_1.prisma.author.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy,
            select: {
                id: true,
                userId: true,
                authorBio: true,
                profilePicture: true,
                status: true,
                appliedAt: true,
                approvedAt: true,
                rejectedAt: true,
                rejectionReason: true,
                reviewedBy: true,
                reviewedAt: true,
                isSuspended: true,
                isDeleted: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        userName: true,
                        email: true,
                        isVerified: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        blogs: {
                            where: {
                                isDeleted: false,
                            },
                        },
                    },
                },
            },
        }),
        prisma_1.prisma.author.count({ where: whereClause }),
    ]);
    const totalPages = Math.ceil(totalCount / limit);
    // 6. Format response
    const formattedAuthors = authors.map((author) => ({
        id: author.id,
        userId: author.userId,
        authorBio: author.authorBio,
        profilePicture: author.profilePicture,
        status: author.status,
        isSuspended: author.isSuspended,
        isDeleted: author.isDeleted,
        appliedAt: author.appliedAt,
        approvedAt: author.approvedAt,
        rejectedAt: author.rejectedAt,
        rejectionReason: author.rejectionReason,
        reviewedBy: author.reviewedBy,
        reviewedAt: author.reviewedAt,
        createdAt: author.createdAt,
        updatedAt: author.updatedAt,
        user: {
            firstName: author.user.firstName,
            lastName: author.user.lastName,
            fullName: `${author.user.firstName} ${author.user.lastName}`,
            userName: author.user.userName,
            email: author.user.email,
            isVerified: author.user.isVerified,
            createdAt: author.user.createdAt,
        },
        blogsCount: author._count.blogs,
    }));
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        {
            authors: formattedAuthors,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
            filters: {
                search,
                status,
                isSuspended,
                isDeleted,
                appliedAfter,
                appliedBefore,
                sortBy,
                sortOrder,
            },
        },
        "Authors retrieved successfully"
    );
});
