// import { signinSchema } from "../../schemas/auth/signinSchema";
// import { catchAsync } from "../../utils/catchAsync";
// import { Request, Response } from "express";
// import { formatZodErrors } from "../../utils/formatZodErrors";
// import { AppError } from "../../utils/appError";
// import { prisma } from "../../database/prisma";
// import { verifyPasswordSignature } from "../../utils/helpers";
// import { generateAuthTokens } from "../../utils/tokenService";
// import { AppResponse } from "../../utils/appResponse";

// const MAX_SESSIONS_PER_USER = 4;

// export const signIn = catchAsync(async (req: Request, res: Response) => {
//     const validationResult = signinSchema.safeParse(req.body);

//     if (!validationResult.success) {
//         const formattedErrors = formatZodErrors(validationResult.error);
//         throw new AppError("Validation failed", 400, formattedErrors);
//     }

//     const { username, password } = validationResult.data;

//     const user = await prisma.user.findFirst({
//         where: {
//             OR: [{ userName: username }, { email: username }],
//             isDeleted: false,
//         },
//     });

//     if (!user) {
//         throw new AppError("Invalid credentials", 401);
//     }

//     if (user.authProvider !== "LOCAL") {
//         throw new AppError(
//             `This account uses ${user.authProvider} authentication. Please sign in with ${user.authProvider}.`,
//             400
//         );
//     }

//     const isValidPassword = await verifyPasswordSignature(password, user.password!);

//     if (!isValidPassword) {
//         throw new AppError("Invalid credentials", 401);
//     }

//     if (!user.isVerified) {
//         throw new AppError("Please verify your email before signing in", 403);
//     }

//     const activeSessions = await prisma.session.findMany({
//         where: {
//             userId: user.id,
//             expiresAt: { gt: new Date() },
//         },
//         orderBy: {
//             lastUsedAt: "desc",
//         },
//         select: {
//             id: true,
//             userAgent: true,
//             ipAddress: true,
//             lastUsedAt: true,
//             createdAt: true,
//         },
//     });

//     if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
//         //error here is pretty unique so we have to deviate a bit from our known strategy
//         return res.status(409).json({
//             success: false,
//             message: `You have reached the maximum of ${MAX_SESSIONS_PER_USER} active sessions. Please sign out from one of your devices to continue.`,
//             error: {
//                 code: "MAX_SESSIONS_REACHED",
//                 maxSessions: MAX_SESSIONS_PER_USER,
//                 currentSessions: activeSessions.length,
//                 sessions: activeSessions.map((session) => ({
//                     id: session.id,
//                     device: parseUserAgent(session.userAgent!),
//                     location: maskIpAddress(session.ipAddress!),
//                     lastUsed: session.lastUsedAt,
//                     createdAt: session.createdAt,
//                 })),
//                 instructions: {
//                     step1: "Review your active sessions above",
//                     step2: "Sign out from a device you no longer use",
//                     step3: "Use DELETE /api/auth/sessions/{sessionId} to remove a session",
//                     step4: "Then try signing in again",
//                 },
//             },
//         });
//     }

//     const sessionData = {
//         userAgent: req.headers["user-agent"],
//         ipAddress: req.ip || req.socket.remoteAddress,
//     };

//     const tokens = await generateAuthTokens(user.id, sessionData);
//     console.log("Tokens:", tokens);

//     res.cookie("refreshToken", tokens.refreshToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//         maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     res.cookie("accessToken", tokens.accessToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//         maxAge: 15 * 60 * 1000,
//     });

//     return AppResponse(
//         res,
//         200,
//         {
//             user: {
//                 email: user.email,
//                 userName: user.userName,
//                 firstName: user.firstName,
//                 lastName: user.lastName,
//                 isVerified: user.isVerified,
//             },
//             accessToken: tokens.accessToken,
//             refreshToken: tokens.refreshToken,
//         },
//         "Sign in successful"
//     );
// });

// // Helper: Parse user agent into human-readable format
// function parseUserAgent(userAgent?: string): string {
//     if (!userAgent) return "Unknown Device";

//     // Mobile devices
//     if (userAgent.includes("Mobile")) {
//         if (userAgent.includes("iPhone")) return "iPhone";
//         if (userAgent.includes("iPad")) return "iPad";
//         if (userAgent.includes("Android")) return "Android Phone";
//         return "Mobile Device";
//     }

//     // Desktop
//     if (userAgent.includes("Macintosh")) return "Mac";
//     if (userAgent.includes("Windows")) return "Windows PC";
//     if (userAgent.includes("Linux")) return "Linux PC";

//     // Browsers
//     if (userAgent.includes("Chrome")) return "Chrome Browser";
//     if (userAgent.includes("Safari")) return "Safari Browser";
//     if (userAgent.includes("Firefox")) return "Firefox Browser";

//     return "Desktop Browser";
// }

// // Helper: Mask IP address for privacy
// function maskIpAddress(ip?: string): string {
//     if (!ip) return "Unknown Location";

//     // For IPv4: 192.168.1.100 -> 192.168.*.*
//     const parts = ip.split(".");
//     if (parts.length === 4) {
//         return `${parts[0]}.${parts[1]}.*.*`;
//     }

//     // For IPv6: Just show first part
//     if (ip.includes(":")) {
//         return ip.split(":")[0] + ":****";
//     }

//     return "Hidden";
// }




import { signinSchema } from "../../schemas/auth/signinSchema";
import { catchAsync } from "../../utils/catchAsync";
import { Request, Response } from "express";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";
import { prisma } from "../../database/prisma";
import { verifyPasswordSignature } from "../../utils/helpers";
import { generateAuthTokens } from "../../utils/tokenService";
import { AppResponse } from "../../utils/appResponse";
import { env } from "../../config/enviroment";

const MAX_SESSIONS_PER_USER = 4;

export const signIn = catchAsync(async (req: Request, res: Response) => {
    const validationResult = signinSchema.safeParse(req.body);

    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { username, password } = validationResult.data;

    const user = await prisma.user.findFirst({
        where: {
            OR: [{ userName: username }, { email: username }],
            isDeleted: false,
        },
    });

    if (!user) {
        throw new AppError("Invalid credentials", 401);
    }

    if (user.authProvider !== "LOCAL") {
        throw new AppError(
            `This account uses ${user.authProvider} authentication. Please sign in with ${user.authProvider}.`,
            400
        );
    }

    const isValidPassword = await verifyPasswordSignature(password, user.password!);

    if (!isValidPassword) {
        throw new AppError("Invalid credentials", 401);
    }

    if (!user.isVerified) {
        throw new AppError("Please verify your email before signing in", 403);
    }

    const activeSessions = await prisma.session.findMany({
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
        return res.status(409).json({
            success: false,
            message: `You have reached the maximum of ${MAX_SESSIONS_PER_USER} active sessions. Please sign out from one of your devices to continue.`,
            error: {
                code: "MAX_SESSIONS_REACHED",
                maxSessions: MAX_SESSIONS_PER_USER,
                currentSessions: activeSessions.length,
                sessions: activeSessions.map((session) => ({
                    id: session.id,
                    device: parseUserAgent(session.userAgent!),
                    location: maskIpAddress(session.ipAddress!),
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

    const tokens = await generateAuthTokens(user.id, sessionData);

       res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
    });
    return AppResponse(
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
function parseUserAgent(userAgent?: string): string {
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
function maskIpAddress(ip?: string): string {
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