"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suspendAuthor = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const suspendAuthorSchema_1 = require("../../schemas/admin/suspendAuthorSchema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
const prisma_1 = require("../../database/prisma");
const appResponse_1 = require("../../utils/appResponse");
exports.suspendAuthor = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.admin) {
        throw new appError_1.AppError("Admin authentication required", 403);
    }
    const validationResult = suspendAuthorSchema_1.suspendAuthorSchema.safeParse({
        ...req.body,
        ...req.params,
    });
    console.log(req.params);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { authorId, reason } = validationResult.data;
    const adminId = req.admin.id;
    const author = await prisma_1.prisma.author.findUnique({
        where: { id: authorId },
        select: {
            id: true,
            userId: true,
            status: true,
            isDeleted: true,
            isSuspended: true,
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    userName: true,
                },
            },
            _count: {
                select: {
                    blogs: {
                        where: { isDeleted: false },
                    },
                },
            },
        },
    });
    if (!author) {
        throw new appError_1.AppError("Author not found", 404);
    }
    if (author.isDeleted) {
        throw new appError_1.AppError("Cannot suspend a deleted author", 400);
    }
    if (author.status !== "APPROVED") {
        throw new appError_1.AppError("Can only suspend APPROVED authors", 400);
    }
    if (author.isSuspended) {
        throw new appError_1.AppError("Author is already suspended", 400);
    }
    const suspendedAuthor = await prisma_1.prisma.$transaction(async (tx) => {
        const updated = await tx.author.update({
            where: { id: authorId },
            data: {
                isSuspended: true,
                rejectionReason: `SUSPENDED: ${reason}`,
                reviewedBy: adminId,
                reviewedAt: new Date(),
            },
        });
        await tx.adminActivityLog.create({
            data: {
                adminId,
                action: "SUSPENDED_AUTHOR",
                entity: "Author",
                entityId: authorId,
                metadata: {
                    authorName: `${author.user.firstName} ${author.user.lastName}`,
                    authorEmail: author.user.email,
                    reason,
                    blogsCount: author._count.blogs,
                },
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            },
        });
        return {
            ...updated,
            blogsCount: author._count.blogs,
        };
    });
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        {
            author: {
                id: suspendedAuthor.id,
                status: suspendedAuthor.status,
                isSuspended: suspendedAuthor.isSuspended,
                blogsRemainVisible: suspendedAuthor.blogsCount,
            },
        },
        `Author suspended. ${suspendedAuthor.blogsCount} blog(s) remain visible.`
    );
});
