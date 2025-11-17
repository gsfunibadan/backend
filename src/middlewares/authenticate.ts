import { Response, NextFunction, Request } from "express";
import { AppError } from "../utils/appError";
import { prisma } from "../database/prisma";
import { catchAsync } from "../utils/catchAsync";
import { AuthRequest } from "../common/constants";
import { verifyAccessToken } from "../utils/tokenService";
import { logger } from "../utils/logger";

function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }

    if (req.cookies?.accessToken) {
        return req.cookies.accessToken;
    }

    return null;
}

async function requireAuthHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    const accessToken = extractToken(req);

    if (!accessToken) {
        throw new AppError("User not authenticated", 401);
    }

    const payload = verifyAccessToken(accessToken);

    if (!payload) {
        throw new AppError("Invalid or expired access token", 401);
    }

    const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: {
            id: true,
            userId: true,
            expiresAt: true,
            lastUsedAt: true,
        },
    });

    if (!session) {
        throw new AppError("Session not found. Please sign in again.", 401);
    }

    if (session.expiresAt < new Date()) {
        throw new AppError("Session expired. Please sign in again.", 401);
    }

    const userDetails = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
            author: {
                where: {
                    isDeleted: false,
                    isSuspended: false,
                },
            },
            admin: {
                where: {
                    isDeleted: false,
                    isActive: true,
                    isSuspended: false,
                },
            },
        },
    });

    if (!userDetails) {
        throw new AppError("User not found", 401);
    }

    if (userDetails.isDeleted) {
        throw new AppError("User account has been deleted", 401);
    }

    prisma.session
        .update({
            where: { id: session.id },
            data: { lastUsedAt: new Date() },
        })
        .catch((err) =>
            logger.error(`Failed to update session lastUsedAt for ${userDetails.id}:`, err)
        );

    const authReq = req as AuthRequest;
    authReq.user = userDetails;
    authReq.author = userDetails.author || null;
    authReq.admin = userDetails.admin || null;
    authReq.isAuthor = !!userDetails.author;
    authReq.isAdmin = !!userDetails.admin;
    authReq.sessionId = payload.sessionId;

    next();
}

export const requireAuth = catchAsync(requireAuthHandler);
