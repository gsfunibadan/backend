"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectAuthor = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const rejectAuthorSchema_1 = require("../../schemas/admin/rejectAuthorSchema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
const prisma_1 = require("../../database/prisma");
const appResponse_1 = require("../../utils/appResponse");
exports.rejectAuthor = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.admin) {
        throw new appError_1.AppError("Admin authentication required", 403);
    }
    const validationResult = rejectAuthorSchema_1.rejectAuthorSchema.safeParse(req.body);
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
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    userName: true,
                },
            },
        },
    });
    if (!author) {
        throw new appError_1.AppError("Author not found", 404);
    }
    if (author.isDeleted) {
        throw new appError_1.AppError("Cannot reject a deleted author", 400);
    }
    if (author.status === "REJECTED") {
        throw new appError_1.AppError("Author is already rejected", 400);
    }
    const rejectedAuthor = await prisma_1.prisma.$transaction(async (tx) => {
        const updated = await tx.author.update({
            where: { id: authorId },
            data: {
                status: "REJECTED",
                rejectedAt: new Date(),
                rejectionReason: reason,
                reviewedBy: adminId,
                reviewedAt: new Date(),
                isSuspended: false,
            },
        });
        await tx.adminActivityLog.create({
            data: {
                adminId,
                action: "REJECTED_AUTHOR",
                entity: "Author",
                entityId: authorId,
                metadata: {
                    authorName: `${author.user.firstName} ${author.user.lastName}`,
                    authorEmail: author.user.email,
                    previousStatus: author.status,
                    reason,
                },
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            },
        });
        return updated;
    });
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        {
            author: {
                id: rejectedAuthor.id,
                status: rejectedAuthor.status,
                rejectedAt: rejectedAuthor.rejectedAt,
            },
        },
        "Author rejected successfully"
    );
});
