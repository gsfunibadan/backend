"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicUserProfile = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const getPublicUserProfileSchema_1 = require("../../schemas/user/getPublicUserProfileSchema");
const appError_1 = require("../../utils/appError");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const prisma_1 = require("../../database/prisma");
const logger_1 = require("../../utils/logger");
const appResponse_1 = require("../../utils/appResponse");
exports.getPublicUserProfile = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = getPublicUserProfileSchema_1.getPublicUserProfileSchema.safeParse({
        userName: req.params.userName,
    });
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { userName } = validationResult.data;
    const user = await prisma_1.prisma.user.findUnique({
        where: { userName },
        select: {
            userName: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            isDeleted: true,
            bio: true,
        },
    });
    if (!user || user.isDeleted) {
        logger_1.logger.warn("Public profile requested for non-existent user", {
            userName,
        });
        throw new appError_1.AppError("User not found", 404);
    }
    const publicProfile = {
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        bio: user.bio,
    };
    logger_1.logger.info("Public user profile fetched successfully", {
        userName,
    });
    return (0, appResponse_1.AppResponse)(
        res,
        200,
        publicProfile,
        "Public profile retrieved successfully"
    );
});
