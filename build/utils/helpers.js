"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUserAgent =
    exports.verifyPasswordSignature =
    exports.timeAgo =
    exports.generateToken =
    exports.comparePassword =
    exports.hashPassword =
        void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const SALT_ROUNDS = 12;
const hashPassword = async (password) => {
    return await bcryptjs_1.default.hash(password, SALT_ROUNDS);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hashedPassword) => {
    return await bcryptjs_1.default.compare(password, hashedPassword);
};
exports.comparePassword = comparePassword;
const generateToken = async (bytes = 32) => {
    return crypto_1.default.randomBytes(bytes).toString("hex");
};
exports.generateToken = generateToken;
const toDate = (dateInput) => {
    const date = new Date(dateInput);
    if (!isValidDate(date)) {
        throw new Error(`Invalid date input: ${dateInput}`);
    }
    return date;
};
const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date.getTime());
};
const formatDate = (dateString) => {
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
const timeAgo = (dateString) => {
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
exports.timeAgo = timeAgo;
const verifyPasswordSignature = async (password, hashedPassword) => {
    return await bcryptjs_1.default.compare(password, hashedPassword);
};
exports.verifyPasswordSignature = verifyPasswordSignature;
const parseUserAgent = (userAgent) => {
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
exports.parseUserAgent = parseUserAgent;
