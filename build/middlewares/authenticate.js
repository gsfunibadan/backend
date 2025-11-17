"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const appError_1 = require("../utils/appError");
const prisma_1 = require("../database/prisma");
const catchAsync_1 = require("../utils/catchAsync");
const tokenService_1 = require("../utils/tokenService");
const logger_1 = require("../utils/logger");
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }
    if (req.cookies?.accessToken) {
        return req.cookies.accessToken;
    }
    return null;
}
async function requireAuthHandler(req, res, next) {
    const accessToken = extractToken(req);
    if (!accessToken) {
        throw new appError_1.AppError("User not authenticated", 401);
    }
    const payload = (0, tokenService_1.verifyAccessToken)(accessToken);
    if (!payload) {
        throw new appError_1.AppError("Invalid or expired access token", 401);
    }
    const session = await prisma_1.prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: {
            id: true,
            userId: true,
            expiresAt: true,
            lastUsedAt: true,
        },
    });
    if (!session) {
        throw new appError_1.AppError("Session not found. Please sign in again.", 401);
    }
    if (session.expiresAt < new Date()) {
        throw new appError_1.AppError("Session expired. Please sign in again.", 401);
    }
    const userDetails = await prisma_1.prisma.user.findUnique({
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
        throw new appError_1.AppError("User not found", 401);
    }
    if (userDetails.isDeleted) {
        throw new appError_1.AppError("User account has been deleted", 401);
    }
    prisma_1.prisma.session
        .update({
            where: { id: session.id },
            data: { lastUsedAt: new Date() },
        })
        .catch((err) =>
            logger_1.logger.error(`Failed to update session lastUsedAt for ${userDetails.id}:`, err)
        );
    const authReq = req;
    authReq.user = userDetails;
    authReq.author = userDetails.author || null;
    authReq.admin = userDetails.admin || null;
    authReq.isAuthor = !!userDetails.author;
    authReq.isAdmin = !!userDetails.admin;
    authReq.sessionId = payload.sessionId;
    next();
}
exports.requireAuth = (0, catchAsync_1.catchAsync)(requireAuthHandler);
