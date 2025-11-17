import { Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { AuthRequest } from "../../common/constants";
import { editAuthorProfileSchema } from "../../schemas/author/editAuthorDetailsSchema";
import { sanityFetchWrapper, sanityPatchWrapper } from "../../utils/sanity/sanityCRUDHandlers";

import { sanityClient } from "../../utils/sanity/sanityClient";

interface Author {
    _id: string;
    userId: string;
    profilePicture?: string;
    userBio?: string;
    authorBio?: string;
    socials?: {
        platform: string;
        url: string;
        handle?: string;
    };
}

interface AuthorProfilePicFromSanity {
    _id: string;
    profilePicture: {
        asset: {
            _id: string;
            url: string;
            metadata: {
                dimensions: {
                    width: number;
                    height: number;
                };
                lqip: string;
            };
        };
        hotspot?: {
            x: number;
            y: number;
            height: number;
            width: number;
        };
        crop?: {
            top: number;
            bottom: number;
            left: number;
            right: number;
        };
    } | null;
}

const updateAuthorProfilePicture = async (
    userId: string,
    authorId: string,
    file: Express.Multer.File
) => {
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

    const isUserExisting = await sanityFetchWrapper<AuthorProfilePicFromSanity>(
        authorProfilePicQuery,
        {
            userId: userId,
        }
    );

    if (!isUserExisting) {
        logger.warn("Author not found in Sanity", { userId });
        throw new AppError("Author not found", 404, [{ author: "Author document not found" }]);
    }

    let imageAsset;
    try {
        imageAsset = await sanityClient.assets.upload("image", file.buffer, {
            filename: file.originalname,
        });
    } catch (uploadError) {
        logger.error("Failed to upload image to Sanity", {
            userId,
            error: uploadError,
        });
        throw new AppError("Failed to upload profile picture", 500, [
            { upload: "Image upload failed" },
        ]);
    }

    const result = await sanityPatchWrapper<Author>(isUserExisting._id, {
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
        logger.error("Failed to update author in Sanity", {
            userId,
            authorId: isUserExisting._id,
        });
        throw new AppError("Failed to update profile picture", 500, [
            { sanity: "Database update failed" },
        ]);
    }

    // Update Prisma with the new profile picture URL
    try {
        await prisma.author.update({
            where: { id: authorId },
            data: { profilePicture: imageAsset.url },
        });
    } catch (prismaError) {
        logger.error("Failed to update profile picture URL in Prisma", {
            userId,
            authorId,
            error: prismaError,
        });
        throw new AppError("Failed to update profile picture in database", 500, [
            { database: "Profile picture URL update failed" },
        ]);
    }

    logger.info("Profile picture updated successfully", {
        userId,
        authorId: result._id,
        imageUrl: imageAsset?.url,
    });

    return {
        _id: result._id,
        url: imageAsset?.url || undefined,
    };
};

export const editAuthorProfile = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        throw new AppError("Authentication required", 401);
    }

    const validationResult = editAuthorProfileSchema.safeParse(req.body);

    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const validatedData = validationResult.data;

    const existingAuthor = await prisma.author.findUnique({
        where: { userId },
    });

    if (!existingAuthor) {
        logger.warn("Author not found ", { userId });
        throw new AppError("Author not found", 404, [{ author: "Author document not found" }]);
    }

    if (existingAuthor.isDeleted) {
        logger.warn("Analytics requested by deleted author", {
            userId,
            authorId: existingAuthor.id,
        });
        throw new AppError("Author account is no longer active", 403, [
            { authorStatus: "Account deactivated" },
        ]);
    }

    if (existingAuthor.isSuspended) {
        logger.warn("Analytics requested by suspended author", {
            userId,
            authorId: existingAuthor.id,
        });
        throw new AppError("Your author account is currently suspended", 403, [
            { authorStatus: "Account suspended" },
        ]);
    }

    if (existingAuthor.status !== "APPROVED") {
        logger.warn("Analytics requested by non-approved author", {
            userId,
            authorId: existingAuthor.id,
            status: existingAuthor.status,
        });

        if (existingAuthor.status === "PENDING") {
            throw new AppError("Your author application is still under review", 403, [
                { authorStatus: "Application pending" },
            ]);
        }

        if (existingAuthor.status === "REJECTED") {
            throw new AppError("Your author application was rejected", 403, [
                { authorStatus: "Application rejected" },
            ]);
        }
    }

    if (existingAuthor.isDeleted) {
        logger.error("Author with deleted user found in analytics", {
            userId,
            authorId: existingAuthor.id,
        });
        throw new AppError("User account not found", 404);
    }

    // Handle profile picture update if file is present
    let profilePictureData;
    if (req.file) {
        profilePictureData = await updateAuthorProfilePicture(userId, existingAuthor.id, req.file);
    }

    //eslint-disable-next-line
    const updateOperations: any = [];

    if (validatedData.bio !== undefined) {
        updateOperations.push(
            prisma.author.update({
                where: { id: existingAuthor.id },
                data: { authorBio: validatedData.bio },
            })
        );
    }

    // Update socials if provided
    if (validatedData.socials !== undefined) {
        updateOperations.push(
            prisma.authorSocial.deleteMany({
                where: { authorId: existingAuthor.id },
            }),
            ...validatedData.socials.map((social) =>
                prisma.authorSocial.create({
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
            await prisma.$transaction(updateOperations);
        }
    } catch (error) {
        logger.error("Failed to update author details", {
            userId,
            authorId: existingAuthor.id,
            error,
        });
        throw new AppError("Failed to update profile", 500, [{ database: "Update failed" }]);
    }

    const updatedAuthor = await prisma.author.findUnique({
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

    logger.info("Author details updated successfully", {
        userId,
        authorId: existingAuthor.id,
        bioUpdated: validatedData.bio !== undefined,
        socialsUpdated: validatedData.socials !== undefined,
        socialsCount: validatedData.socials?.length || 0,
        profilePictureUpdated: !!profilePictureData,
    });

    return AppResponse(res, 200, responseData, "Profile updated successfully");
});
