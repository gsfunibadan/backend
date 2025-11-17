"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const logger_1 = require("../../utils/logger");
exports.getUserProfile = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required", 401);
    }
    console.log(userId);
    const user = await prisma_1.prisma.user.findUnique({
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
            isVerified: true,
            createdAt: true,
            updatedAt: true,
            isDeleted: true,
            author: {
                select: {
                    status: true,
                    authorBio: true,
                    profilePicture: true,
                    appliedAt: true,
                    approvedAt: true,
                    rejectedAt: true,
                    rejectionReason: true,
                    isSuspended: true,
                    isDeleted: true,
                    socials: {
                        select: {
                            id: true,
                            platform: true,
                            url: true,
                            handle: true,
                        },
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
            },
            admin: {
                select: {
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
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    userName: true,
                                },
                            },
                        },
                    },
                },
            },
            _count: {
                select: {
                    comments: {
                        where: {
                            isDeleted: false,
                        },
                    },
                    blogLikes: true,
                    commentLikes: true,
                    blogReads: true,
                },
            },
        },
    });
    if (!user || user.isDeleted) {
        logger_1.logger.warn("Profile requested for non-existent/deleted user", {
            userId,
        });
        throw new appError_1.AppError("User account not found", 404);
    }
    const authorData = user.author && !user.author.isDeleted ? user.author : null;
    const adminData =
        user.admin && !user.admin.isDeleted && !user.admin.isSuspended && user.admin.isActive
            ? user.admin
            : null;
    const profile = {
        id: user.id,
        email: user.email,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        authProvider: user.authProvider,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        author: authorData
            ? {
                  status: authorData.status,
                  authorBio: authorData.authorBio,
                  profilePic: authorData.profilePicture,
                  appliedAt: authorData.appliedAt,
                  approvedAt: authorData.approvedAt,
                  rejectedAt: authorData.rejectedAt,
                  rejectionReason: authorData.rejectionReason,
                  isSuspended: authorData.isSuspended,
                  socials: authorData.socials,
              }
            : null,
        admin: adminData
            ? {
                  invitedAt: adminData.invitedAt,
                  isActive: adminData.isActive,
                  isSuspended: adminData.isSuspended,
                  suspendedAt: adminData.suspendedAt,
                  suspensionReason: adminData.suspensionReason,
                  lastActiveAt: adminData.lastActiveAt,
                  invitedBy: adminData.inviter
                      ? {
                            id: adminData.inviter.user.id,
                            name: `${adminData.inviter.user.firstName} ${adminData.inviter.user.lastName}`,
                            userName: adminData.inviter.user.userName,
                        }
                      : null,
              }
            : null,
        stats: {
            totalComments: user._count.comments,
            totalBlogLikes: user._count.blogLikes,
            totalCommentLikes: user._count.commentLikes,
            totalBlogsRead: user._count.blogReads,
        },
    };
    logger_1.logger.info("User profile fetched successfully", {
        userId,
        isAuthor: !!authorData,
        isAdmin: !!adminData,
    });
    return (0, appResponse_1.AppResponse)(res, 200, profile, "Profile retrieved successfully");
});
