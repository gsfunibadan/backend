import { Response } from "express";
import { AuthRequest } from "../../common/constants";
import { catchAsync } from "../../utils/catchAsync";
import { removeAdminSchema } from "../../schemas/admin/removeAdminSchema";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";
import { prisma } from "../../database/prisma";
import { AppResponse } from "../../utils/appResponse";

export const removeAdmin = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.admin) {
        throw new AppError("Admin authentication required", 403);
    }

    const validationResult = removeAdminSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { adminId, reason } = validationResult.data;
    const removerId = req.admin.id;

    if (adminId === removerId) {
        throw new AppError("You cannot remove yourself. Ask another admin to remove you.", 400);
    }

    const targetAdmin = await prisma.admin.findUnique({
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
        throw new AppError("Admin not found", 404);
    }

    if (targetAdmin.isDeleted) {
        throw new AppError("Admin has already been removed", 400);
    }

    if (!targetAdmin.isActive) {
        throw new AppError("Admin is already inactive", 400);
    }

    const removedAdmin = await prisma.$transaction(async (tx) => {
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

    return AppResponse(
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
