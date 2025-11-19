import { catchAsync } from "../../utils/catchAsync";
import { Response } from "express";
import { AppError } from "../../utils/appError";
import { prisma } from "../../database/prisma";
import { AppResponse } from "../../utils/appResponse";
import { AuthRequest } from "../../common/constants";

export const signOut = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.user || !req.sessionId) {
        throw new AppError("No active session found", 401);
    }

    const { sessionId } = req;

    await prisma.$transaction(async (tx) => {
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
        sameSite: "lax",
        path: "/",
    });

    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth/refresh",
    });

    return AppResponse(res, 200, null, "Signed out successfully");
});
