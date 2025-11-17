import { env } from "./enviroment";
import { logger } from "../utils/logger";

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const initializeEmailService = async (): Promise<void> => {
    logger.info("Email service configured (using Vercel endpoint)");
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
    try {
        const response = await fetch(env.EMAIL_SERVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: options.to,
                subject: options.subject,
                html: options.html,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Email service failed: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        
        logger.info("Email sent successfully", {
            recipient: options.to,
            messageId: result.messageId,
        });
    } catch (error) {
        logger.error("Failed to send email", {
            recipient: options.to,
            subject: options.subject,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
