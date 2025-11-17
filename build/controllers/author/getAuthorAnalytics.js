"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthorAnalytics = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const logger_1 = require("../../utils/logger");
exports.getAuthorAnalytics = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required", 401);
    }
    const author = await prisma_1.prisma.author.findUnique({
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
        logger_1.logger.warn("Analytics requested by non-author user", {
            userId,
        });
        throw new appError_1.AppError("You are not registered as an author", 403, [
            { authorStatus: "Not an author" },
        ]);
    }
    // Check if author is deleted (soft delete)
    if (author.isDeleted) {
        logger_1.logger.warn("Analytics requested by deleted author", {
            userId,
            authorId: author.id,
        });
        throw new appError_1.AppError("Author account is no longer active", 403, [
            { authorStatus: "Account deactivated" },
        ]);
    }
    // Check if author is suspended
    if (author.isSuspended) {
        logger_1.logger.warn("Analytics requested by suspended author", {
            userId,
            authorId: author.id,
        });
        throw new appError_1.AppError("Your author account is currently suspended", 403, [
            { authorStatus: "Account suspended" },
        ]);
    }
    // Check if author is approved
    if (author.status !== "APPROVED") {
        logger_1.logger.warn("Analytics requested by non-approved author", {
            userId,
            authorId: author.id,
            status: author.status,
        });
        // Different message based on status
        if (author.status === "PENDING") {
            throw new appError_1.AppError("Your author application is still under review", 403, [
                { authorStatus: "Application pending" },
            ]);
        }
        if (author.status === "REJECTED") {
            throw new appError_1.AppError("Your author application was rejected", 403, [
                { authorStatus: "Application rejected" },
            ]);
        }
    }
    // Check if user is deleted
    if (author.user.isDeleted) {
        logger_1.logger.error("Author with deleted user found in analytics", {
            userId,
            authorId: author.id,
        });
        throw new appError_1.AppError("User account not found", 404);
    }
    const totalPosts = author.blogs.length;
    const totalLikes = author.blogs.reduce((sum, blog) => sum + blog._count.likes, 0);
    const totalVerifiedViews = author.blogs.reduce((sum, blog) => sum + blog._count.reads, 0);
    const totalGenericViews = author.blogs.reduce((sum, blog) => sum + blog.genericViewCount, 0);
    const analytics = {
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
        },
    };
    logger_1.logger.info("Author analytics fetched successfully", {
        userId,
        authorId: author.id,
        totalPosts,
        totalLikes,
        hasprofilePicture: !!author.profilePicture,
    });
    return (0, appResponse_1.AppResponse)(res, 200, analytics, "Analytics retrieved successfully");
});
