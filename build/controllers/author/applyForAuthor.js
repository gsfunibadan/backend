"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyForAuthor = void 0;
const prisma_1 = require("../../database/prisma");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const logger_1 = require("../../utils/logger");
const applyToBecomeAuthorSchema_1 = require("../../schemas/author/applyToBecomeAuthorSchema");
const sanityClient_1 = require("../../utils/sanity/sanityClient");
/**
 * Bro, I'm kinda sad, this request might take like 2-3s to excecute but here are the issues
 *
 * 1. I want to deploy the entire app for free, so I can't be using something like redis and bullmq
 * 2. I for use pg-boss but the db and the app are on different servers, so I can't use that either
 * 3. The roundtrip from backend to sanity and stuff like that is omo gonna take a while bro
 */
//todo find a way to extend the auth req interface to include file for type safety
exports.applyForAuthor = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.id;
    if (!userId) {
        throw new appError_1.AppError("Authentication required", 401);
    }
    // Check if profile picture was uploaded
    if (!req.file) {
        throw new appError_1.AppError("Profile picture is required", 400, [
            { profilePicture: "Please upload a profile picture" },
        ]);
    }
    const profilePictureFile = req.file;
    const validationResult = applyToBecomeAuthorSchema_1.applyToBecomeAuthorSchema.safeParse(
        req.body
    );
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { bio, socials } = validationResult.data;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        include: {
            author: true,
        },
    });
    if (!user || user.isDeleted) {
        logger_1.logger.warn("Author application attempted by non-existent/deleted user", {
            userId,
        });
        throw new appError_1.AppError("User account not found", 404);
    }
    if (!user.isVerified) {
        logger_1.logger.warn("Unverified user attempted author application", {
            userId,
            email: user.email,
        });
        throw new appError_1.AppError(
            "Please verify your email before applying to become an author",
            403,
            [{ isVerified: "Email verification required" }]
        );
    }
    // Check if user already has an author record
    if (user.author) {
        const { status, isDeleted } = user.author;
        if (!isDeleted) {
            if (status === "APPROVED") {
                throw new appError_1.AppError("You are already an approved author", 400, [
                    { authorStatus: "Already approved" },
                ]);
            }
            if (status === "PENDING") {
                throw new appError_1.AppError(
                    "Your author application is still under review",
                    400,
                    [{ authorStatus: "Application pending" }]
                );
            }
            if (status === "REJECTED") {
                throw new appError_1.AppError(
                    "Your previous author application was rejected. Please contact support for more information.",
                    403,
                    [{ authorStatus: "Reapplication not allowed" }]
                );
            }
        }
    }
    let sanityImageAsset;
    let sanityDocumentId;
    try {
        logger_1.logger.info("Uploading profile picture to Sanity", {
            userId,
            fileName: profilePictureFile.originalname,
            fileSize: profilePictureFile.size,
            mimeType: profilePictureFile.mimetype,
        });
        sanityImageAsset = await sanityClient_1.sanityClient.assets.upload(
            "image",
            profilePictureFile.buffer,
            {
                filename: profilePictureFile.originalname,
            }
        );
        logger_1.logger.info("Image asset uploaded to Sanity", {
            userId,
            assetId: sanityImageAsset._id,
            url: sanityImageAsset.url,
        });
        // Step 2: Create the author document in Sanity
        /**
         * My logic is simple: I don't want to keep track of too many providers, cos typically I would have used something
         * likc cloudinary for image uploads, so I just decided to fall back to sanity, keeps things small and concise
         */
        const authorDoc = {
            _type: "author",
            userDatabaseReferenceId: userId,
            profilePicture: {
                _type: "image",
                asset: {
                    _type: "reference",
                    _ref: sanityImageAsset._id,
                },
            },
        };
        const createdAuthorDoc = await sanityClient_1.sanityClient.create(authorDoc);
        sanityDocumentId = createdAuthorDoc._id;
        logger_1.logger.info("Author document created in Sanity", {
            userId,
            sanityDocumentId,
            sanityAssetId: sanityImageAsset._id,
        });
    } catch (error) {
        logger_1.logger.error("Failed to upload to Sanity", {
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new appError_1.AppError("Failed to upload profile picture", 500, [
            { profilePicture: "Image upload failed" },
        ]);
    }
    // Step 3: Create author record in database (with transaction)
    let newAuthor;
    try {
        newAuthor = await prisma_1.prisma.$transaction(async (tx) => {
            const author = await tx.author.create({
                data: {
                    userId,
                    authorBio: bio,
                    profilePicture: sanityImageAsset.url,
                    sanityDocumentId: sanityDocumentId,
                    status: "PENDING",
                    appliedAt: new Date(),
                },
            });
            // Create social links if provided
            if (socials && socials.length > 0) {
                await tx.authorSocial.createMany({
                    data: socials.map((social) => ({
                        authorId: author.id,
                        platform: social.platform,
                        url: social.url,
                        handle: social.handle || null,
                    })),
                });
            }
            return tx.author.findUnique({
                where: { id: author.id },
                include: {
                    socials: true,
                },
            });
        });
    } catch (error) {
        // Database transaction failed - rollback Sanity uploads
        logger_1.logger.error("Author creation failed, cleaning up Sanity resources", {
            userId,
            sanityDocumentId,
            sanityAssetId: sanityImageAsset._id,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        // Cleanup: Delete both the document and the image asset
        try {
            // Delete the author document
            await sanityClient_1.sanityClient.delete(sanityDocumentId);
            await sanityClient_1.sanityClient.delete(sanityImageAsset._id);
            logger_1.logger.info("Sanity cleanup successful", {
                userId,
                sanityDocumentId,
                sanityAssetId: sanityImageAsset._id,
            });
        } catch (cleanupError) {
            logger_1.logger.error("Failed to cleanup Sanity resources after DB error", {
                userId,
                sanityDocumentId,
                sanityAssetId: sanityImageAsset._id,
                cleanupError:
                    cleanupError instanceof Error ? cleanupError.message : "Unknown error",
            });
        }
        throw new appError_1.AppError(
            "Failed to create author application. Please try again.",
            500
        );
    }
    logger_1.logger.info("Author application submitted successfully", {
        userId,
        authorId: newAuthor.id,
        hasSocials: socials && socials.length > 0,
        sanityDocumentId,
    });
    return (0, appResponse_1.AppResponse)(
        res,
        201,
        {
            authorId: newAuthor.id,
            status: newAuthor.status,
            appliedAt: newAuthor.appliedAt,
            profilePicture: sanityImageAsset.url,
        },
        "Author application submitted successfully. You will be notified once reviewed."
    );
});
