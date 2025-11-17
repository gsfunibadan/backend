"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editAuthorProfile = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const editAuthorDetailsSchema_1 = require("../../schemas/author/editAuthorDetailsSchema");
const sanityCRUDHandlers_1 = require("../../utils/sanity/sanityCRUDHandlers");
const sanityClient_1 = require("../../utils/sanity/sanityClient");
const updateAuthorProfilePicture = async (userId, authorId, file) => {
    const authorProfilePicQuery = `*[_type == "author" && userDatabaseReferenceId == $userId][0] {
    _id,
    profilePicture {
      asset-> {
        _id,
        url,
        metadata {
          dimensions {
            width,
            height
          },
          lqip
        }
      },
      hotspot,
      crop
    }
  }`;
    const isUserExisting = await (0, sanityCRUDHandlers_1.sanityFetchWrapper)(
        authorProfilePicQuery,
        {
            userId: userId,
        }
    );
    if (!isUserExisting) {
        logger_1.logger.warn("Author not found in Sanity", { userId });
        throw new appError_1.AppError("Author not found", 404, [
            { author: "Author document not found" },
        ]);
    }
    let imageAsset;
    try {
        imageAsset = await sanityClient_1.sanityClient.assets.upload("image", file.buffer, {
            filename: file.originalname,
        });
    } catch (uploadError) {
        logger_1.logger.error("Failed to upload image to Sanity", {
            userId,
            error: uploadError,
        });
        throw new appError_1.AppError("Failed to upload profile picture", 500, [
            { upload: "Image upload failed" },
        ]);
    }
    const result = await (0, sanityCRUDHandlers_1.sanityPatchWrapper)(isUserExisting._id, {
        set: {
            profilePicture: {
                _type: "image",
                asset: {
                    _type: "reference",
                    _ref: imageAsset._id,
                },
            },
        },
    });
    if (!result) {
        logger_1.logger.error("Failed to update author in Sanity", {
            userId,
            authorId: isUserExisting._id,
        });
        throw new appError_1.AppError("Failed to update profile picture", 500, [
            { sanity: "Database update failed" },
        ]);
    }
    // Update Prisma with the new profile picture URL
    try {
        await prisma_1.prisma.author.update({
            where: { id: authorId },
            data: { profilePicture: imageAsset.url },
        });
    } catch (prismaError) {
        logger_1.logger.error("Failed to update profile picture URL in Prisma", {
            userId,
            authorId,
            error: prismaError,
        });
        throw new appError_1.AppError("Failed to update profile picture in database", 500, [
            { database: "Profile picture URL update failed" },
        ]);
    }
    logger_1.logger.info("Profile picture updated successfully", {
        userId,
        authorId: result._id,
        imageUrl: imageAsset?.url,
    });
    return {
        _id: result._id,
        url: imageAsset?.url || undefined,
    };
};
exports.editAuthorProfile = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required", 401);
    }
    const validationResult = editAuthorDetailsSchema_1.editAuthorProfileSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const validatedData = validationResult.data;
    const existingAuthor = await prisma_1.prisma.author.findUnique({
        where: { userId },
    });
    if (!existingAuthor) {
        logger_1.logger.warn("Author not found ", { userId });
        throw new appError_1.AppError("Author not found", 404, [
            { author: "Author document not found" },
        ]);
    }
    if (existingAuthor.isDeleted) {
        logger_1.logger.warn("Analytics requested by deleted author", {
            userId,
            authorId: existingAuthor.id,
        });
        throw new appError_1.AppError("Author account is no longer active", 403, [
            { authorStatus: "Account deactivated" },
        ]);
    }
    if (existingAuthor.isSuspended) {
        logger_1.logger.warn("Analytics requested by suspended author", {
            userId,
            authorId: existingAuthor.id,
        });
        throw new appError_1.AppError("Your author account is currently suspended", 403, [
            { authorStatus: "Account suspended" },
        ]);
    }
    if (existingAuthor.status !== "APPROVED") {
        logger_1.logger.warn("Analytics requested by non-approved author", {
            userId,
            authorId: existingAuthor.id,
            status: existingAuthor.status,
        });
        if (existingAuthor.status === "PENDING") {
            throw new appError_1.AppError("Your author application is still under review", 403, [
                { authorStatus: "Application pending" },
            ]);
        }
        if (existingAuthor.status === "REJECTED") {
            throw new appError_1.AppError("Your author application was rejected", 403, [
                { authorStatus: "Application rejected" },
            ]);
        }
    }
    if (existingAuthor.isDeleted) {
        logger_1.logger.error("Author with deleted user found in analytics", {
            userId,
            authorId: existingAuthor.id,
        });
        throw new appError_1.AppError("User account not found", 404);
    }
    // Handle profile picture update if file is present
    let profilePictureData;
    if (req.file) {
        profilePictureData = await updateAuthorProfilePicture(userId, existingAuthor.id, req.file);
    }
    //eslint-disable-next-line
    const updateOperations = [];
    if (validatedData.bio !== undefined) {
        updateOperations.push(
            prisma_1.prisma.author.update({
                where: { id: existingAuthor.id },
                data: { authorBio: validatedData.bio },
            })
        );
    }
    // Update socials if provided
    if (validatedData.socials !== undefined) {
        updateOperations.push(
            prisma_1.prisma.authorSocial.deleteMany({
                where: { authorId: existingAuthor.id },
            }),
            ...validatedData.socials.map((social) =>
                prisma_1.prisma.authorSocial.create({
                    data: {
                        authorId: existingAuthor.id,
                        platform: social.platform,
                        url: social.url,
                        handle: social.handle || null,
                    },
                })
            )
        );
    }
    try {
        if (updateOperations.length > 0) {
            await prisma_1.prisma.$transaction(updateOperations);
        }
    } catch (error) {
        logger_1.logger.error("Failed to update author details", {
            userId,
            authorId: existingAuthor.id,
            error,
        });
        throw new appError_1.AppError("Failed to update profile", 500, [
            { database: "Update failed" },
        ]);
    }
    const updatedAuthor = await prisma_1.prisma.author.findUnique({
        where: { id: existingAuthor.id },
        include: {
            socials: true,
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
        },
    });
    // Transform the response to exclude unwanted IDs
    const responseData = {
        authorBio: updatedAuthor?.authorBio,
        profilePicture: updatedAuthor?.profilePicture,
        user: updatedAuthor?.user,
        socials: updatedAuthor?.socials.map((social) => ({
            id: social.id,
            platform: social.platform,
            url: social.url,
            handle: social.handle,
        })),
        ...(profilePictureData && { profilePictureUpdate: profilePictureData }),
    };
    logger_1.logger.info("Author details updated successfully", {
        userId,
        authorId: existingAuthor.id,
        bioUpdated: validatedData.bio !== undefined,
        socialsUpdated: validatedData.socials !== undefined,
        socialsCount: validatedData.socials?.length || 0,
        profilePictureUpdated: !!profilePictureData,
    });
    return (0, appResponse_1.AppResponse)(res, 200, responseData, "Profile updated successfully");
});
