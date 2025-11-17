import { User } from "@prisma/client";
import { sendEmail } from "../../config/emailServiceConfig";
import verifyNewUserEmail from "./emailTemplates/verifyNewUserEmail";
import { env } from "../../config/enviroment";
import { generateToken } from "../helpers";
import { prisma } from "../../database/prisma";
import { logger } from "../logger";
import resetPasswordEmail from "./emailTemplates/resetPasswordEmail";
import inviteAdminEmail from "./emailTemplates/inviteAdminEmail";
import approveAuthorEmail from "./emailTemplates/approveAuthorEmail";
import suspendAuthorEmail from "./emailTemplates/suspendAuthorEmail";
import adminInviteAcceptedEmail from "./emailTemplates/adminInviteAcceptedEmail";

export const sendWelcomeEmail = async (user: User): Promise<void> => {
    const { email, firstName, id } = user;

    try {
        const verificationToken = await generateToken(32);

        await prisma.verificationToken.create({
            data: {
                token: verificationToken,
                userId: id,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });

        const verificationUrl = `${env.FRONTEND_URL}/auth/verify-email/${verificationToken}?email=${email}`;

        await ({
            to: email,
            subject: "Welcome to The Gofamint UI Platform",
            html: verifyNewUserEmail(firstName, verificationUrl),
        });

        logger.info(`Welcome email sent successfully to ${email}`);
    } catch (error) {
        logger.error("Failed to send welcome email", {
            userId: id,
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};

export const sendPasswordResetEmail = async (user: User): Promise<void> => {
    const { email, firstName, id } = user;

    try {
        // Generate and save verification token
        const resetToken = await generateToken(32);

        const deletedCount = await prisma.verificationToken.deleteMany({
            where: {
                userId: user.id,
                type: "PASSWORD_RESET",
            },
        });

        logger.info("Deleted old password reset tokens", {
            userId: user.id,
            count: deletedCount.count,
        });

        await prisma.verificationToken.create({
            data: {
                token: resetToken,
                userId: id,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                type: "PASSWORD_RESET",
            },
        });

        const resetUrl = `${env.FRONTEND_URL}/auth/forgot-password/reset/${resetToken}?email=${email}`;

        await sendEmail({
            to: email,
            subject: "Reset Your Password",
            html: resetPasswordEmail(firstName, resetUrl),
        });

        logger.info(`Password reset email sent successfully to ${email}`);
    } catch (error) {
        logger.error("Failed to send password reset email", {
            userId: id,
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};

export const sendAdminInvitationEmail = async (
    token: string,
    inviterName: string,
    email: string,
    inviteeFirstName: string
) => {
    try {
        const inviteUrl = `${env.FRONTEND_URL}/admin/accept-invitation?token=${token}`;

        await sendEmail({
            to: email,
            subject: "Admin Invitation to Gofamint UI Platform",
            html: inviteAdminEmail(inviterName, inviteUrl, inviteeFirstName),
        });
    } catch (error) {
        logger.error("Failed to send Admin Invite Email", {
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};

export const sendAuthorApprovedEmail = async (email: string, firstName: string) => {
    try {
        await sendEmail({
            to: email,
            subject: "Your Author Application Has Been Approved",
            html: approveAuthorEmail(firstName),
        });
    } catch (error) {
        logger.error("Failed to send Author Approved Email", {
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};

export const sendAuthorSuspendedEmail = async (email: string) => {
    try {
        await sendEmail({
            to: email,
            subject: "Your Author Account Has Been Suspended",
            html: suspendAuthorEmail(),
        });
    } catch (error) {
        logger.error("Failed to send Author Suspended Email", {
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};

export const sendAdminInviteAcceptedEmail = async (
    inviterName: string,
    email: string,
    inviteeFirstName: string,
    dashboardUrl: string
) => {
    try {
        await sendEmail({
            to: email,
            subject: "Admin Invitation Accepted",
            html: adminInviteAcceptedEmail(inviteeFirstName, inviterName, dashboardUrl),
        });
    } catch (error) {
        logger.error("Failed to send Admin Invite Accepted Email", {
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};
