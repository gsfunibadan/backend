import { Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppResponse } from "../../utils/appResponse";
import { prisma } from "../../database/prisma";
import { AuthRequest } from "../../common/constants";

import { inviteAdminSchema } from "../../schemas/admin/inviteAdminSchema";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";
import { generateToken } from "../../utils/helpers";
import { sendAdminInvitationEmail } from "../../utils/emails/emailHandlers";

export const inviteAdmin = catchAsync(async (req: AuthRequest, res: Response) => {
    const validationResult = inviteAdminSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { email } = validationResult.data;

    if (!req.admin) {
        throw new AppError("This action can only be performed by an Admin");
    }
    const adminId = req.admin.id;
    const inviterName = req.user?.firstName + " " + req.user?.lastName;

    if (!email || !email.trim()) {
        throw new AppError("Email is required");
    }

    const normalizedEmail = email.trim();

    const user = await prisma.user.findUnique({
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
        throw new AppError("No user found with this email. User must create an account first.");
    }

    if (user.isDeleted) {
        throw new AppError("Cannot invite a deleted user");
    }

    if (user.admin) {
        if (user.admin.isDeleted) {
            throw new AppError(
                "This user was previously an admin. Contact support to restore access."
            );
        }
        if (user.admin.isSuspended) {
            throw new AppError(
                "This user is a suspended admin. Unsuspend them instead of sending a new invitation."
            );
        }
    }

    const existingInvitation = await prisma.adminInvitation.findFirst({
        where: {
            email: normalizedEmail,
            status: "PENDING",
            expiresAt: { gte: new Date() },
        },
    });

    if (existingInvitation) {
        throw new AppError("A pending invitation already exists for this email");
    }

    const token = await generateToken(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const invitation = await prisma.adminInvitation.create({
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

    sendAdminInvitationEmail(token, inviterName, normalizedEmail, user.firstName);

    await prisma.adminActivityLog.create({
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

    return AppResponse(
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
