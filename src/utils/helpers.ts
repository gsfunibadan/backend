import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;
export const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hashedPassword: string) => {
    return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = async (bytes: number = 32): Promise<string> => {
    return crypto.randomBytes(bytes).toString("hex");
};

const toDate = (dateInput: DateInput): Date => {
    const date = new Date(dateInput);
    if (!isValidDate(date)) {
        throw new Error(`Invalid date input: ${dateInput}`);
    }
    return date;
};

type DateInput = string | number | Date;

const isValidDate = (date: unknown): date is Date => {
    return date instanceof Date && !isNaN(date.getTime());
};
const formatDate = (dateString: DateInput): string => {
    try {
        const date = toDate(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return "Invalid date";
    }
};

export const timeAgo = (dateString: DateInput): string => {
    try {
        const now = new Date();
        const date = toDate(dateString);

        if (!isValidDate(now) || !isValidDate(date)) {
            return "Invalid date";
        }

        const diffInMs = now.getTime() - date.getTime();

        if (diffInMs < 0) {
            return "In the future";
        }

        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInHours < 1) return "Just now";
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return formatDate(date);
    } catch (error) {
        console.error("Error calculating time ago:", error);
        return "Invalid date";
    }
};

export const verifyPasswordSignature = async (password: string, hashedPassword: string) => {
    return await bcrypt.compare(password, hashedPassword);
};

export const parseUserAgent = (userAgent?: string): string => {
    if (!userAgent) return "Unknown Device";

    if (userAgent.includes("Mobile")) {
        if (userAgent.includes("iPhone")) return "iPhone";
        if (userAgent.includes("Android")) return "Android Phone";
        return "Mobile Device";
    }

    if (userAgent.includes("iPad")) return "iPad";
    if (userAgent.includes("Macintosh")) return "Mac";
    if (userAgent.includes("Windows")) return "Windows PC";
    if (userAgent.includes("Linux")) return "Linux PC";

    return "Desktop Browser";
};
