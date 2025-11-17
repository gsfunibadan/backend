"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAdminInviteAcceptedEmail =
    exports.sendAuthorSuspendedEmail =
    exports.sendAuthorApprovedEmail =
    exports.sendAdminInvitationEmail =
    exports.sendPasswordResetEmail =
    exports.sendWelcomeEmail =
        void 0;
const emailServiceConfig_1 = require("../../config/emailServiceConfig");
const verifyNewUserEmail_1 = __importDefault(require("./emailTemplates/verifyNewUserEmail"));
const enviroment_1 = require("../../config/enviroment");
const helpers_1 = require("../helpers");
const prisma_1 = require("../../database/prisma");
const logger_1 = require("../logger");
const resetPasswordEmail_1 = __importDefault(require("./emailTemplates/resetPasswordEmail"));
const inviteAdminEmail_1 = __importDefault(require("./emailTemplates/inviteAdminEmail"));
const approveAuthorEmail_1 = __importDefault(require("./emailTemplates/approveAuthorEmail"));
const suspendAuthorEmail_1 = __importDefault(require("./emailTemplates/suspendAuthorEmail"));
const adminInviteAcceptedEmail_1 = __importDefault(
    require("./emailTemplates/adminInviteAcceptedEmail")
);
const sendWelcomeEmail = async (user) => {
    const { email, firstName, id } = user;
    try {
        const verificationToken = await (0, helpers_1.generateToken)(32);
        await prisma_1.prisma.verificationToken.create({
            data: {
                token: verificationToken,
                userId: id,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        const verificationUrl = `${enviroment_1.env.FRONTEND_URL}/auth/verify-email/${verificationToken}?email=${email}`;
        await (0, emailServiceConfig_1.sendEmail)({
            to: email,
            subject: "Welcome to The Gofamint UI Platform",
            html: (0, verifyNewUserEmail_1.default)(firstName, verificationUrl),
        });
        logger_1.logger.info(`Welcome email sent successfully to ${email}`);
    } catch (error) {
        logger_1.logger.error("Failed to send welcome email", {
            userId: id,
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};
exports.sendWelcomeEmail = sendWelcomeEmail;
const sendPasswordResetEmail = async (user) => {
    const { email, firstName, id } = user;
    try {
        // Generate and save verification token
        const resetToken = await (0, helpers_1.generateToken)(32);
        const deletedCount = await prisma_1.prisma.verificationToken.deleteMany({
            where: {
                userId: user.id,
                type: "PASSWORD_RESET",
            },
        });
        logger_1.logger.info("Deleted old password reset tokens", {
            userId: user.id,
            count: deletedCount.count,
        });
        await prisma_1.prisma.verificationToken.create({
            data: {
                token: resetToken,
                userId: id,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                type: "PASSWORD_RESET",
            },
        });
        const resetUrl = `${enviroment_1.env.FRONTEND_URL}/auth/forgot-password/reset/${resetToken}?email=${email}`;
        await (0, emailServiceConfig_1.sendEmail)({
            to: email,
            subject: "Reset Your Password",
            html: (0, resetPasswordEmail_1.default)(firstName, resetUrl),
        });
        logger_1.logger.info(`Password reset email sent successfully to ${email}`);
    } catch (error) {
        logger_1.logger.error("Failed to send password reset email", {
            userId: id,
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendAdminInvitationEmail = async (token, inviterName, email, inviteeFirstName) => {
    try {
        const inviteUrl = `${enviroment_1.env.FRONTEND_URL}/admin/accept-invitation?token=${token}`;
        await (0, emailServiceConfig_1.sendEmail)({
            to: email,
            subject: "Admin Invitation to Gofamint UI Platform",
            html: (0, inviteAdminEmail_1.default)(inviterName, inviteUrl, inviteeFirstName),
        });
    } catch (error) {
        logger_1.logger.error("Failed to send Admin Invite Email", {
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};
exports.sendAdminInvitationEmail = sendAdminInvitationEmail;
const sendAuthorApprovedEmail = async (email, firstName) => {
    try {
        await (0, emailServiceConfig_1.sendEmail)({
            to: email,
            subject: "Your Author Application Has Been Approved",
            html: (0, approveAuthorEmail_1.default)(firstName),
        });
    } catch (error) {
        logger_1.logger.error("Failed to send Author Approved Email", {
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};
exports.sendAuthorApprovedEmail = sendAuthorApprovedEmail;
const sendAuthorSuspendedEmail = async (email) => {
    try {
        await (0, emailServiceConfig_1.sendEmail)({
            to: email,
            subject: "Your Author Account Has Been Suspended",
            html: (0, suspendAuthorEmail_1.default)(),
        });
    } catch (error) {
        logger_1.logger.error("Failed to send Author Suspended Email", {
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};
exports.sendAuthorSuspendedEmail = sendAuthorSuspendedEmail;
const sendAdminInviteAcceptedEmail = async (inviterName, email, inviteeFirstName, dashboardUrl) => {
    try {
        await (0, emailServiceConfig_1.sendEmail)({
            to: email,
            subject: "Admin Invitation Accepted",
            html: (0, adminInviteAcceptedEmail_1.default)(
                inviteeFirstName,
                inviterName,
                dashboardUrl
            ),
        });
    } catch (error) {
        logger_1.logger.error("Failed to send Admin Invite Accepted Email", {
            email: email,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};
exports.sendAdminInviteAcceptedEmail = sendAdminInviteAcceptedEmail;
