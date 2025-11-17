import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { prisma } from "../database/prisma";
import { AppError } from "./appError";
import crypto from "crypto";
import { env } from "../config/enviroment";

interface TokenPayload extends JwtPayload {
    userId: string;
    email: string;
    sessionId: string;
    tokenId?: string;
}

interface SessionData {
    userAgent?: string;
    ipAddress?: string;
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    sessionId: string;
}

export async function generateAuthTokens(
    userId: string,
    sessionData: SessionData = {}
): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isDeleted: true },
    });

    if (!user || user.isDeleted) {
        throw new AppError("User not found", 404);
    }

    // Create a new session
    const session = await prisma.session.create({
        data: {
            userId,
            userAgent: sessionData.userAgent,
            ipAddress: sessionData.ipAddress,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            lastUsedAt: new Date(), // Track when session was last used
        },
    });

    // Generate unique ID for refresh token
    const refreshTokenId = crypto.randomBytes(40).toString("hex");

    const accessToken = jwt.sign(
        {
            userId: user.id,
            email: user.email,
            sessionId: session.id,
        },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: env.ACCESS_TOKEN_EXPIRY } as SignOptions
    );

    const refreshToken = jwt.sign(
        {
            userId: user.id,
            email: user.email,
            sessionId: session.id,
            tokenId: refreshTokenId,
        },
        env.REFRESH_TOKEN_SECRET,
        { expiresIn: env.REFRESH_TOKEN_EXPIRY } as SignOptions
    );

    await prisma.refreshToken.create({
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

export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as TokenPayload;
        return decoded;
    } catch {
        return null;
    }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    try {
        // 1. Decode and verify the JWT signature
        const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as TokenPayload;

        if (!decoded.tokenId) {
            return null;
        }

        // 2. Check if token exists in database and is not revoked
        const storedToken = await prisma.refreshToken.findFirst({
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

export async function rotateRefreshToken(oldRefreshToken: string): Promise<AuthTokens> {
    const payload = await verifyRefreshToken(oldRefreshToken);

    if (!payload) {
        throw new AppError("Invalid or expired refresh token", 401);
    }

    const decoded = jwt.verify(oldRefreshToken, env.REFRESH_TOKEN_SECRET) as TokenPayload;

    // 3. Revoke old refresh token in a transaction with creating new one
    const result = await prisma.$transaction(async (tx) => {
        // Revoke the old token
        await tx.refreshToken.updateMany({
            where: {
                token: decoded.tokenId!,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
            },
        });

        // Generate new refresh token ID
        const newRefreshTokenId = crypto.randomBytes(40).toString("hex");

        const newRefreshToken = jwt.sign(
            {
                userId: payload.userId,
                email: payload.email,
                sessionId: payload.sessionId,
                tokenId: newRefreshTokenId,
            },
            env.REFRESH_TOKEN_SECRET,
            { expiresIn: env.REFRESH_TOKEN_EXPIRY } as SignOptions
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

    const newAccessToken = jwt.sign(
        {
            userId: payload.userId,
            email: payload.email,
            sessionId: payload.sessionId,
        },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: env.ACCESS_TOKEN_EXPIRY } as SignOptions
    );

    return {
        accessToken: newAccessToken,
        refreshToken: result,
        sessionId: payload.sessionId,
    };
}

export async function revokeRefreshToken(token: string): Promise<void> {
    try {
        const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as TokenPayload;

        if (!decoded.tokenId) {
            return;
        }

        await prisma.refreshToken.updateMany({
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

export async function revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
        where: {
            session: { userId },
            isRevoked: false,
        },
        data: { isRevoked: true },
    });
}

export async function revokeSessionTokens(sessionId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
        where: {
            sessionId,
            isRevoked: false,
        },
        data: { isRevoked: true },
    });
}
