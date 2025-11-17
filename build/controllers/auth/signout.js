"use strict";
// controllers/auth/signOut.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.signOut = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const appError_1 = require("../../utils/appError");
const prisma_1 = require("../../database/prisma");
const appResponse_1 = require("../../utils/appResponse");
exports.signOut = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.user || !req.sessionId) {
        throw new appError_1.AppError("No active session found", 401);
    }
    const { sessionId } = req;
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.refreshToken.updateMany({
            where: {
                sessionId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
            },
        });
        await tx.session.delete({
            where: {
                id: sessionId,
            },
        });
    });
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Use env check
        sameSite: "strict",
        path: "/",
    });
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth/refresh",
    });
    return (0, appResponse_1.AppResponse)(res, 200, null, "Signed out successfully");
});
