import { catchAsync } from "../../utils/catchAsync";
import { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { rotateRefreshToken } from "../../utils/tokenService";
import { AppResponse } from "../../utils/appResponse";

export const refreshToken = catchAsync(async (req: Request, res: Response) => {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
        throw new AppError("No refresh token provided", 401);
    }

    const tokens = await rotateRefreshToken(oldRefreshToken);

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

    return AppResponse(
        res,
        200,
        {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        },
        "Token refreshed successfully"
    );
});
