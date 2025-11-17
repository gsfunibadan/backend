import { Response } from "express";
import { AuthRequest } from "../../common/constants";
import { catchAsync } from "../../utils/catchAsync";
import { resendAdminInviteSchema } from "../../schemas/admin/resendAdminInviteschema";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";
import { prisma } from "../../database/prisma";
import { generateToken } from "../../utils/helpers";
import { sendAdminInvitationEmail } from "../../utils/emails/emailHandlers";
import { AppResponse } from "../../utils/appResponse";

export const resendAdminInvite = catchAsync(async (req: AuthRequest, res: Response) => {
    const validationResult = resendAdminInviteSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    if (!req.admin) {
        throw new AppError("Admin Access is Required to perform this action");
    }
    const { email } = validationResult.data;
    const adminId = req.admin.id;
    const inviterName = req.user?.firstName + " " + req.user?.lastName;

    const normalizedEmail = email.trim();

    const invitation = await prisma.adminInvitation.findFirst({
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
        throw new AppError("Invitation not found", 404);
    }

    if (invitation.status == "PENDING") {
        throw new AppError("Invitation Still Pending", 401);
    }

    const hasInviteBeenAccepted = await prisma.user.findUnique({
        where: {
            email,
        },
        select: {
            admin: true,
        },
    });

    if (hasInviteBeenAccepted?.admin?.isActive) {
        throw new AppError("Invitation has already been accepted", 401);
    }

    if (hasInviteBeenAccepted?.admin?.isSuspended) {
        throw new AppError("Invitation has already been accepted", 401);
    }
    const newToken = await generateToken(32);
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const updatedInvitation = await prisma.adminInvitation.update({
        where: { id: invitation.id },
        data: {
            token: newToken,
            expiresAt: newExpiresAt,
            sentAt: new Date(),
        },
    });

    // Resend email
    //I wish I did not have to specify "!", but if we fi don reach that point everywhere semo
    sendAdminInvitationEmail(newToken, inviterName, normalizedEmail, invitation.user!.firstName);

    await prisma.adminActivityLog.create({
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

    return AppResponse(
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
