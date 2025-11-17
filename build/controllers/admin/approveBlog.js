"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveBlog = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const appResponse_1 = require("../../utils/appResponse");
const prisma_1 = require("../../database/prisma");
const approveBlog_1 = require("../../schemas/admin/approveBlog");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
exports.approveBlog = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = approveBlog_1.approveBlogschema.safeParse(req.params);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { blogId } = validationResult.data;
    if (!req.admin) {
        throw new appError_1.AppError("Only Admins can perform this action", 403);
    }
    const adminId = req.admin.id;
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
        throw new appError_1.AppError("Blog does not exist", 404);
    }
    if (blog.isDeleted) {
        throw new appError_1.AppError("Cannot approve a deleted blog", 400);
    }
    if (blog.isApproved) {
        throw new appError_1.AppError("Blog is already approved", 400);
    }
    // eslint-disable-next-line
    const [updatedBlog, _activityLog] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.blog.update({
            where: { id: blogId },
            data: {
                isApproved: true,
                approvedBy: adminId,
                approvedAt: new Date(),
                lastUnapprovedBy: null,
                lastUnapprovedAt: null,
                unapprovalReason: null,
            },
            select: {
                id: true,
                sanitySlug: true,
                isApproved: true,
                approvedBy: true,
                approvedAt: true,
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
                action: "APPROVED_BLOG",
                entity: "Blog",
                entityId: blogId,
                metadata: {
                    blogSlug: blog.sanitySlug,
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
            message: `Blog "${blog.id}" approved successfully`,
        },
        "Blog approved successfully"
    );
});
