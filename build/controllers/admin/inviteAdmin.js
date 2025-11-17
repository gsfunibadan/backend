"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteAdmin = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const appResponse_1 = require("../../utils/appResponse");
const prisma_1 = require("../../database/prisma");
const inviteAdminSchema_1 = require("../../schemas/admin/inviteAdminSchema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
const helpers_1 = require("../../utils/helpers");
const emailHandlers_1 = require("../../utils/emails/emailHandlers");
exports.inviteAdmin = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = inviteAdminSchema_1.inviteAdminSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { email } = validationResult.data;
    if (!req.admin) {
        throw new appError_1.AppError("This action can only be performed by an Admin");
    }
    const adminId = req.admin.id;
    const inviterName = req.user?.firstName + " " + req.user?.lastName;
    if (!email || !email.trim()) {
        throw new appError_1.AppError("Email is required");
    }
    const normalizedEmail = email.trim();
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isDeleted: true,
            admin: {
                select: {
                    id: true,
                    isActive: true,
                    isSuspended: true,
                    isDeleted: true,
                },
            },
        },
    });
    if (!user) {
        throw new appError_1.AppError(
            "No user found with this email. User must create an account first."
        );
    }
    if (user.isDeleted) {
        throw new appError_1.AppError("Cannot invite a deleted user");
    }
    if (user.admin) {
        if (user.admin.isDeleted) {
            throw new appError_1.AppError(
                "This user was previously an admin. Contact support to restore access."
            );
        }
        if (user.admin.isSuspended) {
            throw new appError_1.AppError(
                "This user is a suspended admin. Unsuspend them instead of sending a new invitation."
            );
        }
    }
    const existingInvitation = await prisma_1.prisma.adminInvitation.findFirst({
        where: {
            email: normalizedEmail,
            status: "PENDING",
            expiresAt: { gte: new Date() },
        },
    });
    if (existingInvitation) {
        throw new appError_1.AppError("A pending invitation already exists for this email");
    }
    const token = await (0, helpers_1.generateToken)(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    const invitation = await prisma_1.prisma.adminInvitation.create({
        data: {
            email: normalizedEmail,
            token,
            invitedBy: adminId,
            expiresAt,
            status: "PENDING",
        },
        select: {
            id: true,
            email: true,
            sentAt: true,
            expiresAt: true,
            inviter: {
                select: {
                    user: {
                        select: { firstName: true, lastName: true, email: true },
                    },
                },
            },
        },
    });
    (0, emailHandlers_1.sendAdminInvitationEmail)(
        token,
        inviterName,
        normalizedEmail,
        user.firstName
    );
    await prisma_1.prisma.adminActivityLog.create({
        data: {
            adminId,
            action: "SENT_ADMIN_INVITATION",
            entity: "AdminInvitation",
            entityId: invitation.id,
            metadata: {
                inviteeEmail: normalizedEmail,
                expiresAt: invitation.expiresAt,
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
                id: invitation.id,
                email: invitation.email,
                sentAt: invitation.sentAt,
                expiresAt: invitation.expiresAt,
            },
        },
        "Admin invitation sent successfully"
    );
});
