"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAuthTokens = generateAuthTokens;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.rotateRefreshToken = rotateRefreshToken;
exports.revokeRefreshToken = revokeRefreshToken;
exports.revokeAllUserTokens = revokeAllUserTokens;
exports.revokeSessionTokens = revokeSessionTokens;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../database/prisma");
const appError_1 = require("./appError");
const crypto_1 = __importDefault(require("crypto"));
const enviroment_1 = require("../config/enviroment");
async function generateAuthTokens(userId, sessionData = {}) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isDeleted: true },
    });
    if (!user || user.isDeleted) {
        throw new appError_1.AppError("User not found", 404);
    }
    // Create a new session
    const session = await prisma_1.prisma.session.create({
        data: {
            userId,
            userAgent: sessionData.userAgent,
            ipAddress: sessionData.ipAddress,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            lastUsedAt: new Date(), // Track when session was last used
        },
    });
    // Generate unique ID for refresh token
    const refreshTokenId = crypto_1.default.randomBytes(40).toString("hex");
    const accessToken = jsonwebtoken_1.default.sign(
        {
            userId: user.id,
            email: user.email,
            sessionId: session.id,
        },
        enviroment_1.env.ACCESS_TOKEN_SECRET,
        { expiresIn: enviroment_1.env.ACCESS_TOKEN_EXPIRY }
    );
    const refreshToken = jsonwebtoken_1.default.sign(
        {
            userId: user.id,
            email: user.email,
            sessionId: session.id,
            tokenId: refreshTokenId,
        },
        enviroment_1.env.REFRESH_TOKEN_SECRET,
        { expiresIn: enviroment_1.env.REFRESH_TOKEN_EXPIRY }
    );
    await prisma_1.prisma.refreshToken.create({
        data: {
            sessionId: session.id,
            token: refreshTokenId, // Store just the tokenId
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
    return {
        accessToken,
        refreshToken,
        sessionId: session.id,
    };
}
function verifyAccessToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, enviroment_1.env.ACCESS_TOKEN_SECRET);
        return decoded;
    } catch {
        return null;
    }
}
async function verifyRefreshToken(token) {
    try {
        // 1. Decode and verify the JWT signature
        const decoded = jsonwebtoken_1.default.verify(token, enviroment_1.env.REFRESH_TOKEN_SECRET);
        if (!decoded.tokenId) {
            return null;
        }
        // 2. Check if token exists in database and is not revoked
        const storedToken = await prisma_1.prisma.refreshToken.findFirst({
            where: {
                token: decoded.tokenId,
                isRevoked: false,
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: {
                session: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                isDeleted: true,
                            },
                        },
                    },
                },
            },
        });
        if (!storedToken) {
            return null;
        }
        // 3. Validate session is still active
        if (storedToken.session.expiresAt < new Date()) {
            return null;
        }
        // 4. Validate user still exists
        if (storedToken.session.user.isDeleted) {
            return null;
        }
        // Return payload with sessionId
        return {
            userId: decoded.userId,
            email: decoded.email,
            sessionId: decoded.sessionId,
        };
    } catch {
        return null;
    }
}
async function rotateRefreshToken(oldRefreshToken) {
    const payload = await verifyRefreshToken(oldRefreshToken);
    if (!payload) {
        throw new appError_1.AppError("Invalid or expired refresh token", 401);
    }
    const decoded = jsonwebtoken_1.default.verify(
        oldRefreshToken,
        enviroment_1.env.REFRESH_TOKEN_SECRET
    );
    // 3. Revoke old refresh token in a transaction with creating new one
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        // Revoke the old token
        await tx.refreshToken.updateMany({
            where: {
                token: decoded.tokenId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
            },
        });
        // Generate new refresh token ID
        const newRefreshTokenId = crypto_1.default.randomBytes(40).toString("hex");
        const newRefreshToken = jsonwebtoken_1.default.sign(
            {
                userId: payload.userId,
                email: payload.email,
                sessionId: payload.sessionId,
                tokenId: newRefreshTokenId,
            },
            enviroment_1.env.REFRESH_TOKEN_SECRET,
            { expiresIn: enviroment_1.env.REFRESH_TOKEN_EXPIRY }
        );
        await tx.refreshToken.create({
            data: {
                sessionId: payload.sessionId, // ← Same session
                token: newRefreshTokenId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        await tx.session.update({
            where: { id: payload.sessionId },
            data: { lastUsedAt: new Date() },
        });
        return newRefreshToken;
    });
    const newAccessToken = jsonwebtoken_1.default.sign(
        {
            userId: payload.userId,
            email: payload.email,
            sessionId: payload.sessionId,
        },
        enviroment_1.env.ACCESS_TOKEN_SECRET,
        { expiresIn: enviroment_1.env.ACCESS_TOKEN_EXPIRY }
    );
    return {
        accessToken: newAccessToken,
        refreshToken: result,
        sessionId: payload.sessionId,
    };
}
async function revokeRefreshToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, enviroment_1.env.REFRESH_TOKEN_SECRET);
        if (!decoded.tokenId) {
            return;
        }
        await prisma_1.prisma.refreshToken.updateMany({
            where: {
                token: decoded.tokenId,
                isRevoked: false,
            },
            data: { isRevoked: true },
        });
    } catch (error) {
        console.error("Error revoking token:", error);
    }
}
async function revokeAllUserTokens(userId) {
    await prisma_1.prisma.refreshToken.updateMany({
        where: {
            session: { userId },
            isRevoked: false,
        },
        data: { isRevoked: true },
    });
}
async function revokeSessionTokens(sessionId) {
    await prisma_1.prisma.refreshToken.updateMany({
        where: {
            sessionId,
            isRevoked: false,
        },
        data: { isRevoked: true },
    });
}
