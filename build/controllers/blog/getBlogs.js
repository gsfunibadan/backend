"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlogs = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const getBlogsSchema_1 = require("../../schemas/blogs/getBlogsSchema");
exports.getBlogs = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = getBlogsSchema_1.getBlogsSchema.safeParse(req.query);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { page, limit, search, sortBy, sortOrder } = validationResult.data;
    const skip = (page - 1) * limit;
    //todo, omo come learn more about prisma so that you can properly type this shit dawg
    const whereClause = {
        isApproved: true,
        isDeleted: false,
        author: {
            isDeleted: false,
            isSuspended: false,
            status: "APPROVED",
            user: {
                isDeleted: false,
            },
        },
    };
    if (search && search.trim() !== "") {
        const searchTerm = search.trim();
        whereClause.OR = [
            {
                sanitySlug: {
                    contains: searchTerm,
                    mode: "insensitive",
                },
            },
            // Search in author's first name
            {
                author: {
                    user: {
                        firstName: {
                            contains: searchTerm,
                            mode: "insensitive",
                        },
                    },
                },
            },
            // Search in author's last name
            {
                author: {
                    user: {
                        lastName: {
                            contains: searchTerm,
                            mode: "insensitive",
                        },
                    },
                },
            },
            {
                author: {
                    user: {
                        userName: {
                            contains: searchTerm,
                            mode: "insensitive",
                        },
                    },
                },
            },
            // This handles cases like searching "John Doe"
            {
                author: {
                    user: {
                        AND: searchTerm.split(" ").map((term) => ({
                            OR: [
                                {
                                    firstName: {
                                        contains: term,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    lastName: {
                                        contains: term,
                                        mode: "insensitive",
                                    },
                                },
                            ],
                        })),
                    },
                },
            },
        ];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderByClause;
    //This is just in case sha, ain't no way I'm adding that from the jump in the UI, coding most of all of it don almost kpai me
    switch (sortBy) {
        case "publishedAt":
            orderByClause = [
                { publishedAt: sortOrder },
                { createdAt: sortOrder }, // Fallback if publishedAt is null
            ];
            break;
        case "views":
            orderByClause = [
                { verifiedViewCount: sortOrder },
                { genericViewCount: sortOrder },
                { publishedAt: "desc" },
            ];
            break;
        case "likes":
            orderByClause = [{ likes: { _count: sortOrder } }, { publishedAt: "desc" }];
            break;
        case "comments":
            orderByClause = [{ comments: { _count: sortOrder } }, { publishedAt: "desc" }];
            break;
        default:
            orderByClause = [{ publishedAt: "desc" }, { createdAt: "desc" }];
    }
    // Get total count for pagination
    const totalCount = await prisma_1.prisma.blog.count({
        where: whereClause,
    });
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;
    const hasPrevious = page > 1;
    // Fetch blogs with all required data
    const blogs = await prisma_1.prisma.blog.findMany({
        where: whereClause,
        select: {
            id: true,
            sanityId: true,
            sanitySlug: true,
            publishedAt: true,
            genericViewCount: true,
            verifiedViewCount: true,
            _count: {
                select: {
                    likes: true,
                    comments: {
                        where: {
                            isDeleted: false,
                        },
                    },
                },
            },
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
                        },
                    },
                },
            },
        },
        orderBy: orderByClause,
        skip,
        take: limit,
    });
    const blogItems = blogs.map((blog) => ({
        id: blog.id,
        sanityId: blog.sanityId,
        sanitySlug: blog.sanitySlug,
        publishedAt: blog.publishedAt,
        genericViewCount: blog.genericViewCount,
        verifiedViewCount: blog.verifiedViewCount,
        likesCount: blog._count.likes,
        commentsCount: blog._count.comments,
        author: {
            id: blog.author.id,
            authorBio: blog.author.authorBio,
            profilePicture: blog.author.profilePicture,
            user: {
                firstName: blog.author.user.firstName,
                lastName: blog.author.user.lastName,
                userName: blog.author.user.userName,
            },
        },
    }));
    const response = {
        blogs: blogItems,
        pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            pageSize: limit,
            hasMore,
            hasPrevious,
        },
        filters: {
            ...(search && { search }),
            sortBy,
            sortOrder,
        },
    };
    logger_1.logger.info("Blogs fetched successfully", {
        page,
        limit,
        search: search || "none",
        sortBy,
        totalCount,
        returnedCount: blogItems.length,
    });
    return (0, appResponse_1.AppResponse)(res, 200, response, "Blogs retrieved successfully");
});
