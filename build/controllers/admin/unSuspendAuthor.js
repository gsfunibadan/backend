"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsuspendAuthor = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const unsuspendAuthorSchema_1 = require("../../schemas/admin/unsuspendAuthorSchema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
const prisma_1 = require("../../database/prisma");
const appResponse_1 = require("../../utils/appResponse");
exports.unsuspendAuthor = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.admin) {
        throw new appError_1.AppError("Admin authentication required", 403);
    }
    const validationResult = unsuspendAuthorSchema_1.unsuspendAuthorSchema.safeParse(req.params);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { authorId } = validationResult.data;
    const adminId = req.admin.id;
    const author = await prisma_1.prisma.author.findUnique({
        where: { id: authorId },
        select: {
            id: true,
            status: true,
            isSuspended: true,
            isDeleted: true,
        },
    });
    if (!author) {
        throw new appError_1.AppError("Author not found", 404);
    }
    if (author.isDeleted) {
        throw new appError_1.AppError("Cannot unsuspend a deleted author", 400);
    }
    if (!author.isSuspended) {
        throw new appError_1.AppError("Author is not suspended", 400);
    }
    const unsuspendedAuthor = await prisma_1.prisma.$transaction(async (tx) => {
        const updated = await tx.author.update({
            where: { id: authorId },
            data: {
                isSuspended: false,
                rejectionReason: null,
            },
        });
        await tx.adminActivityLog.create({
            data: {
                adminId,
                action: "UNSUSPENDED_AUTHOR",
                entity: "Author",
                entityId: authorId,
                metadata: {},
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
                id: unsuspendedAuthor.id,
                status: unsuspendedAuthor.status,
                isSuspended: unsuspendedAuthor.isSuspended,
            },
        },
        "Author unsuspended successfully"
    );
});
