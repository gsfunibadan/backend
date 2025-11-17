"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptAdminInvite = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const acceptAdminInviteSchema_1 = require("../../schemas/admin/acceptAdminInviteSchema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const prisma_1 = require("../../database/prisma");
const emailHandlers_1 = require("../../utils/emails/emailHandlers");
const enviroment_1 = require("../../config/enviroment");
exports.acceptAdminInvite = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = acceptAdminInviteSchema_1.acceptAdminInviteSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { token } = validationResult.data;
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    if (!userId || !userEmail) {
        return (0, appResponse_1.AppResponse)(res, 401, null, "Authentication required");
    }
    const invitation = await prisma_1.prisma.adminInvitation.findUnique({
        where: { token: token.trim() },
        select: {
            id: true,
            email: true,
            userId: true,
            status: true,
            expiresAt: true,
            invitedBy: true,
            acceptedAt: true,
            revokedAt: true,
        },
    });
    if (!invitation) {
        throw new appError_1.AppError("Invalid invitation token", 400);
    }
    if (invitation.status === "ACCEPTED") {
        throw new appError_1.AppError("This invite has already been accepted", 400);
    }
    if (invitation.status === "REVOKED") {
        throw new appError_1.AppError("This invitation has already been revoked", 400);
    }
    if (invitation.expiresAt < new Date()) {
        await prisma_1.prisma.adminInvitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
        });
        throw new appError_1.AppError("Expired Invite, You can attempt to request a new one", 400);
    }
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
        throw new appError_1.AppError("This invite ain't meant for you dawg", 400);
    }
    const existingAdmin = await prisma_1.prisma.admin.findUnique({
        where: { userId },
    });
    if (existingAdmin) {
        throw new appError_1.AppError("You is already an admin", 400);
    }
    // eslint-disable-next-line
    const [admin, _updatedInvitation, _activityLog] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.admin.create({
            data: {
                userId,
                invitedBy: invitation.invitedBy,
                isActive: true,
            },
            select: {
                id: true,
                userId: true,
                invitedAt: true,
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
        }),
        prisma_1.prisma.adminInvitation.update({
            where: { id: invitation.id },
            data: {
                status: "ACCEPTED",
                acceptedAt: new Date(),
                userId,
            },
        }),
        prisma_1.prisma.adminActivityLog.create({
            data: {
                adminId: invitation.invitedBy,
                action: "ADMIN_INVITATION_ACCEPTED",
                entity: "Admin",
                entityId: userId,
                metadata: {
                    invitationId: invitation.id,
                    newAdminEmail: userEmail,
                },
            },
        }),
    ]);
    const inviter = await prisma_1.prisma.admin.findUnique({
        where: { id: invitation.invitedBy },
        select: {
            user: {
                select: {
                    firstName: true,
                    email: true,
                },
            },
        },
    });
    const inviteeName = admin.user.firstName;
    const email = admin.user.email;
    const dashboardUrl = enviroment_1.env.FRONTEND_URL + "/dashboard";
    const inviterName = inviter?.user.firstName || "Admin";
    (0, emailHandlers_1.sendAdminInviteAcceptedEmail)(
        inviterName,
        email,
        inviteeName,
        dashboardUrl
    );
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        {
            admin: {
                user: admin.user,
                invitedAt: admin.invitedAt,
            },
        },
        "Admin invitation accepted successfully. You are now an admin!"
    );
});
//Gbemi debe
