"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unapproveBlog = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const unapproveBlog_1 = require("../../schemas/admin/unapproveBlog");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
const prisma_1 = require("../../database/prisma");
const appResponse_1 = require("../../utils/appResponse");
exports.unapproveBlog = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = unapproveBlog_1.unapproveBlogschema.safeParse({
        ...req.params,
        ...req.body,
    });
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    if (!req.admin) {
        throw new appError_1.AppError("Admin authentication required", 401);
    }
    const adminId = req.admin.id;
    const { blogId, reason } = validationResult.data;
    // Validate reason
    if (!reason || reason.trim().length === 0) {
        throw new appError_1.AppError("Unapproval reason is required", 400);
    }
    if (reason.trim().length < 10) {
        throw new appError_1.AppError("Unapproval reason must be at least 10 characters", 400);
    }
    // Check if blog exists
    const blog = await prisma_1.prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            sanitySlug: true,
            isApproved: true,
            isDeleted: true,
            author: {
                select: {
                    user: {
                        select: { userName: true, email: true },
                    },
                },
            },
        },
    });
    if (!blog) {
        throw new appError_1.AppError("Blog not found", 404);
    }
    if (blog.isDeleted) {
        throw new appError_1.AppError("Cannot unapprove a deleted blog", 400);
    }
    if (!blog.isApproved) {
        throw new appError_1.AppError("Blog is not currently approved", 400);
    }
    // eslint-disable-next-line
    const [updatedBlog, _activityLog] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.blog.update({
            where: { id: blogId },
            data: {
                isApproved: false,
                approvedBy: null,
                approvedAt: null,
                lastUnapprovedBy: adminId,
                lastUnapprovedAt: new Date(),
                unapprovalReason: reason.trim(),
            },
            select: {
                id: true,
                sanitySlug: true,
                isApproved: true,
                lastUnapprovedBy: true,
                lastUnapprovedAt: true,
                unapprovalReason: true,
                author: {
                    select: {
                        user: {
                            select: { userName: true, firstName: true, lastName: true },
                        },
                    },
                },
            },
        }),
        prisma_1.prisma.adminActivityLog.create({
            data: {
                adminId,
                action: "UNAPPROVED_BLOG",
                entity: "Blog",
                entityId: blogId,
                metadata: {
                    blogSlug: blog.sanitySlug,
                    reason: reason.trim(),
                    authorUsername: blog.author.user.userName,
                },
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            },
        }),
    ]);
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        {
            blog: updatedBlog,
            message: `Blog "${blog.sanitySlug}" unapproved`,
        },
        "Blog unapproved successfully"
    );
});
