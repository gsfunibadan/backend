"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const appError_1 = require("../../utils/appError");
const tokenService_1 = require("../../utils/tokenService");
const appResponse_1 = require("../../utils/appResponse");
exports.refreshToken = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
        throw new appError_1.AppError("No refresh token provided", 401);
    }
    const tokens = await (0, tokenService_1.rotateRefreshToken)(oldRefreshToken);
    res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: "/",
    });
    res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/api/auth/refresh",
    });
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        },
        "Token refreshed successfully"
    );
});
