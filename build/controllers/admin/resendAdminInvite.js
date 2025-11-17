"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendAdminInvite = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const resendAdminInviteschema_1 = require("../../schemas/admin/resendAdminInviteschema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
const prisma_1 = require("../../database/prisma");
const helpers_1 = require("../../utils/helpers");
const emailHandlers_1 = require("../../utils/emails/emailHandlers");
const appResponse_1 = require("../../utils/appResponse");
exports.resendAdminInvite = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = resendAdminInviteschema_1.resendAdminInviteSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    if (!req.admin) {
        throw new appError_1.AppError("Admin Access is Required to perform this action");
    }
    const { email } = validationResult.data;
    const adminId = req.admin.id;
    const inviterName = req.user?.firstName + " " + req.user?.lastName;
    const normalizedEmail = email.trim();
    const invitation = await prisma_1.prisma.adminInvitation.findFirst({
        where: {
            email: normalizedEmail,
            invitedBy: adminId,
        },
        select: {
            id: true,
            email: true,
            status: true,
            expiresAt: true,
            user: true,
        },
    });
    if (!invitation) {
        throw new appError_1.AppError("Invitation not found", 404);
    }
    if (invitation.status == "PENDING") {
        throw new appError_1.AppError("Invitation Still Pending", 401);
    }
    const hasInviteBeenAccepted = await prisma_1.prisma.user.findUnique({
        where: {
            email,
        },
        select: {
            admin: true,
        },
    });
    if (hasInviteBeenAccepted?.admin?.isActive) {
        throw new appError_1.AppError("Invitation has already been accepted", 401);
    }
    if (hasInviteBeenAccepted?.admin?.isSuspended) {
        throw new appError_1.AppError("Invitation has already been accepted", 401);
    }
    const newToken = await (0, helpers_1.generateToken)(32);
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);
    const updatedInvitation = await prisma_1.prisma.adminInvitation.update({
        where: { id: invitation.id },
        data: {
            token: newToken,
            expiresAt: newExpiresAt,
            sentAt: new Date(),
        },
    });
    // Resend email
    //I wish I did not have to specify "!", but if we fi don reach that point everywhere semo
    (0, emailHandlers_1.sendAdminInvitationEmail)(
        newToken,
        inviterName,
        normalizedEmail,
        invitation.user.firstName
    );
    await prisma_1.prisma.adminActivityLog.create({
        data: {
            adminId,
            action: "RESENT_ADMIN_INVITATION",
            entity: "AdminInvitation",
            entityId: invitation.id,
            metadata: {
                inviteeEmail: invitation.email,
            },
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        },
    });
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        {
            invitation: {
                id: updatedInvitation.id,
                email: updatedInvitation.email,
                sentAt: updatedInvitation.sentAt,
                expiresAt: updatedInvitation.expiresAt,
            },
        },
        "Invitation resent successfully"
    );
});
