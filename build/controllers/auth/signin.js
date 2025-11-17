"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signIn = void 0;
const signinSchema_1 = require("../../schemas/auth/signinSchema");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const appError_1 = require("../../utils/appError");
const prisma_1 = require("../../database/prisma");
const helpers_1 = require("../../utils/helpers");
const tokenService_1 = require("../../utils/tokenService");
const appResponse_1 = require("../../utils/appResponse");
const MAX_SESSIONS_PER_USER = 4;
exports.signIn = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = signinSchema_1.signinSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { username, password } = validationResult.data;
    const user = await prisma_1.prisma.user.findFirst({
        where: {
            OR: [{ userName: username }, { email: username }],
            isDeleted: false,
        },
    });
    if (!user) {
        throw new appError_1.AppError("Invalid credentials", 401);
    }
    if (user.authProvider !== "LOCAL") {
        throw new appError_1.AppError(
            `This account uses ${user.authProvider} authentication. Please sign in with ${user.authProvider}.`,
            400
        );
    }
    const isValidPassword = await (0, helpers_1.verifyPasswordSignature)(password, user.password);
    if (!isValidPassword) {
        throw new appError_1.AppError("Invalid credentials", 401);
    }
    if (!user.isVerified) {
        throw new appError_1.AppError("Please verify your email before signing in", 403);
    }
    const activeSessions = await prisma_1.prisma.session.findMany({
        where: {
            userId: user.id,
            expiresAt: { gt: new Date() },
        },
        orderBy: {
            lastUsedAt: "desc",
        },
        select: {
            id: true,
            userAgent: true,
            ipAddress: true,
            lastUsedAt: true,
            createdAt: true,
        },
    });
    if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
        //error here is pretty unique so we have to deviate a bit from our known strategy
        return res.status(409).json({
            success: false,
            message: `You have reached the maximum of ${MAX_SESSIONS_PER_USER} active sessions. Please sign out from one of your devices to continue.`,
            error: {
                code: "MAX_SESSIONS_REACHED",
                maxSessions: MAX_SESSIONS_PER_USER,
                currentSessions: activeSessions.length,
                sessions: activeSessions.map((session) => ({
                    id: session.id,
                    device: parseUserAgent(session.userAgent),
                    location: maskIpAddress(session.ipAddress),
                    lastUsed: session.lastUsedAt,
                    createdAt: session.createdAt,
                })),
                instructions: {
                    step1: "Review your active sessions above",
                    step2: "Sign out from a device you no longer use",
                    step3: "Use DELETE /api/auth/sessions/{sessionId} to remove a session",
                    step4: "Then try signing in again",
                },
            },
        });
    }
    const sessionData = {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip || req.socket.remoteAddress,
    };
    const tokens = await (0, tokenService_1.generateAuthTokens)(user.id, sessionData);
    console.log("Tokens:", tokens);
    res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
    });
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        {
            user: {
                email: user.email,
                userName: user.userName,
                firstName: user.firstName,
                lastName: user.lastName,
                isVerified: user.isVerified,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        },
        "Sign in successful"
    );
});
// Helper: Parse user agent into human-readable format
function parseUserAgent(userAgent) {
    if (!userAgent) return "Unknown Device";
    // Mobile devices
    if (userAgent.includes("Mobile")) {
        if (userAgent.includes("iPhone")) return "iPhone";
        if (userAgent.includes("iPad")) return "iPad";
        if (userAgent.includes("Android")) return "Android Phone";
        return "Mobile Device";
    }
    // Desktop
    if (userAgent.includes("Macintosh")) return "Mac";
    if (userAgent.includes("Windows")) return "Windows PC";
    if (userAgent.includes("Linux")) return "Linux PC";
    // Browsers
    if (userAgent.includes("Chrome")) return "Chrome Browser";
    if (userAgent.includes("Safari")) return "Safari Browser";
    if (userAgent.includes("Firefox")) return "Firefox Browser";
    return "Desktop Browser";
}
// Helper: Mask IP address for privacy
function maskIpAddress(ip) {
    if (!ip) return "Unknown Location";
    // For IPv4: 192.168.1.100 -> 192.168.*.*
    const parts = ip.split(".");
    if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.*.*`;
    }
    // For IPv6: Just show first part
    if (ip.includes(":")) {
        return ip.split(":")[0] + ":****";
    }
    return "Hidden";
}
