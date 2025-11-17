"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editUserProfile = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const editProfileSchema_1 = require("../../schemas/user/editProfileSchema");
exports.editUserProfile = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required", 401);
    }
    const validationResult = editProfileSchema_1.editProfileSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { userName, firstName, lastName, bio, phoneNumber } = validationResult.data;
    const existingUser = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            isDeleted: true,
            userName: true,
            phoneNumber: true,
        },
    });
    if (!existingUser || existingUser.isDeleted) {
        logger_1.logger.warn("Profile update attempted for non-existent/deleted user", {
            userId,
        });
        throw new appError_1.AppError("User account not found", 404);
    }
    if (userName !== undefined && userName !== null) {
        if (userName !== existingUser.userName) {
            const userNameExists = await prisma_1.prisma.user.findFirst({
                where: {
                    userName,
                    NOT: {
                        id: userId,
                    },
                    isDeleted: false,
                },
            });
            if (userNameExists) {
                logger_1.logger.warn("Profile update failed - username taken", {
                    userId,
                    userName,
                });
                throw new appError_1.AppError("Username is already in use", 409, [
                    { userName: "Username has already been taken" },
                ]);
            }
        }
    }
    if (phoneNumber !== undefined && phoneNumber !== null) {
        if (phoneNumber !== existingUser.phoneNumber) {
            const phoneExists = await prisma_1.prisma.user.findFirst({
                where: {
                    phoneNumber,
                    NOT: {
                        id: userId,
                    },
                    isDeleted: false,
                },
            });
            if (phoneExists) {
                logger_1.logger.warn("Profile update failed - phone number taken", {
                    userId,
                    phoneNumber: phoneNumber.substring(0, 3) + "***",
                });
                throw new appError_1.AppError("Phone number is already in use", 409, [
                    { phoneNumber: "Phone number has already been taken" },
                ]);
            }
        }
    }
    const normalizedBio = bio !== undefined ? (bio === "" ? null : bio) : undefined;
    const normalizedPhoneNumber =
        phoneNumber !== undefined ? (phoneNumber === "" ? null : phoneNumber) : undefined;
    // Build update data object dynamically
    // Only include fields that were actually provided
    const updateData = {
        updatedAt: new Date(),
    };
    // Only add fields if they were provided in request
    if (userName !== undefined && userName !== null) {
        updateData.userName = userName;
    }
    if (firstName !== undefined && firstName !== null) {
        updateData.firstName = firstName;
    }
    if (lastName !== undefined && lastName !== null) {
        updateData.lastName = lastName;
    }
    // Only add bio if it was provided in request
    if (normalizedBio !== undefined) {
        updateData.bio = normalizedBio;
    }
    // Only add phoneNumber if it was provided in request
    if (normalizedPhoneNumber !== undefined) {
        updateData.phoneNumber = normalizedPhoneNumber;
    }
    const updatedUser = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            userName: true,
            firstName: true,
            lastName: true,
            bio: true,
            phoneNumber: true,
            updatedAt: true,
        },
    });
    const profile = {
        userName: updatedUser.userName,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        bio: updatedUser.bio,
        phoneNumber: updatedUser.phoneNumber,
        updatedAt: updatedUser.updatedAt,
    };
    logger_1.logger.info("User profile updated successfully", {
        userId,
        fieldsUpdated: Object.keys(updateData).filter((k) => k !== "updatedAt"),
    });
    return (0, appResponse_1.AppResponse)(res, 200, profile, "Profile updated successfully");
});
