"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.getEmailTransporter = exports.initializeEmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const enviroment_1 = require("./enviroment");
const logger_1 = require("../utils/logger");
let transporter = null;
const initializeEmailService = async () => {
    try {
        transporter = nodemailer_1.default.createTransport({
            host: enviroment_1.env.EMAIL_HOST,
            auth: {
                user: enviroment_1.env.EMAIL_USER,
                pass: enviroment_1.env.EMAIL_PASSWORD,
            },
        });
        await transporter.verify();
        logger_1.logger.info("Email service initialized successfully");
    } catch (error) {
        logger_1.logger.error("Email service initialization failed:", error);
        // Don't throw - let app start even if email is down
    }
};
exports.initializeEmailService = initializeEmailService;
const getEmailTransporter = () => {
    if (!transporter) {
        throw new Error("Email service not initialized. Call initializeEmailService() first.");
    }
    return transporter;
};
exports.getEmailTransporter = getEmailTransporter;
const sendEmail = async (options) => {
    try {
        const emailTransporter = (0, exports.getEmailTransporter)();
        const info = await emailTransporter.sendMail({
            from: enviroment_1.env.EMAIL_USER,
            ...options,
        });
        logger_1.logger.info("Email sent successfully", {
            messageId: info.messageId,
            recipient: options.to,
        });
    } catch (error) {
        logger_1.logger.error("Failed to send email", {
            recipient: options.to,
            subject: options.subject,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.sendEmail = sendEmail;
