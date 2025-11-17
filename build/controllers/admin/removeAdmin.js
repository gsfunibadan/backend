"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAdmin = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const removeAdminSchema_1 = require("../../schemas/admin/removeAdminSchema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
const prisma_1 = require("../../database/prisma");
const appResponse_1 = require("../../utils/appResponse");
exports.removeAdmin = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.admin) {
        throw new appError_1.AppError("Admin authentication required", 403);
    }
    const validationResult = removeAdminSchema_1.removeAdminSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { adminId, reason } = validationResult.data;
    const removerId = req.admin.id;
    if (adminId === removerId) {
        throw new appError_1.AppError(
            "You cannot remove yourself. Ask another admin to remove you.",
            400
        );
    }
    const targetAdmin = await prisma_1.prisma.admin.findUnique({
        where: { id: adminId },
        select: {
            id: true,
            userId: true,
            isDeleted: true,
            isActive: true,
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
    if (!targetAdmin) {
        throw new appError_1.AppError("Admin not found", 404);
    }
    if (targetAdmin.isDeleted) {
        throw new appError_1.AppError("Admin has already been removed", 400);
    }
    if (!targetAdmin.isActive) {
        throw new appError_1.AppError("Admin is already inactive", 400);
    }
    const removedAdmin = await prisma_1.prisma.$transaction(async (tx) => {
        const updated = await tx.admin.update({
            where: { id: adminId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: removerId,
                isActive: false, // Also deactivate
            },
            select: {
                id: true,
                userId: true,
                deletedAt: true,
                deletedBy: true,
            },
        });
        await tx.session.updateMany({
            where: {
                userId: targetAdmin.userId,
                expiresAt: { gt: new Date() },
            },
            data: {
                expiresAt: new Date(),
            },
        });
        await tx.adminInvitation.updateMany({
            where: {
                invitedBy: adminId,
                status: "PENDING",
            },
            data: {
                status: "REVOKED",
                revokedAt: new Date(),
                revokedBy: removerId,
                revokeReason: `Inviter admin removed: ${reason}`,
            },
        });
        await tx.adminActivityLog.create({
            data: {
                adminId: removerId,
                action: "REMOVED_ADMIN",
                entity: "Admin",
                entityId: adminId,
                metadata: {
                    removedAdminId: adminId,
                    removedAdminEmail: targetAdmin.user.email,
                    removedAdminName: `${targetAdmin.user.firstName} ${targetAdmin.user.lastName}`,
                    removedAdminUsername: targetAdmin.user.userName,
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
            admin: {
                id: removedAdmin.id,
                userId: removedAdmin.userId,
                removedAt: removedAdmin.deletedAt,
                removedBy: removedAdmin.deletedBy,
            },
        },
        "Admin removed successfully"
    );
});
