import { Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { AuthRequest } from "../../common/constants";
import { createNewBlogSchema } from "../../schemas/blogs/createNewBlogSchema";

export const createBlog = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AppError("Authentication required", 401);
    }

    const validationResult = createNewBlogSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { sanityId, sanitySlug, authorId } = validationResult.data;

    const author = await prisma.author.findUnique({
        where: { id: authorId },
        select: {
            id: true,
            status: true,
            isDeleted: true,
            isSuspended: true,
        },
    });

    if (!author || author.isDeleted) {
        throw new AppError("Author not found", 404);
    }

    if (author.status !== "APPROVED") {
        throw new AppError("Author must be approved to create blogs", 403);
    }

    if (author.isSuspended) {
        throw new AppError("Author is currently suspended", 403);
    }

    if (author.isDeleted) {
        throw new AppError("Your author account has been deleted", 403);
    }

    const existingBlog = await prisma.blog.findFirst({
        where: {
            OR: [{ sanityId }, { sanitySlug }],
        },
    });

    if (existingBlog) {
        throw new AppError("Blog Already exists", 409);
    }

    const blog = await prisma.blog.create({
        data: {
            sanityId,
            sanitySlug,
            authorId,
            lastSyncedBy: userId,
            lastSyncedAt: new Date(),
        },
        include: {
            author: {
                select: {
                    id: true,
                    userId: true,
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            userName: true,
                        },
                    },
                },
            },
        },
    });

    logger.info("Blog created successfully", {
        blogId: blog.id,
        sanityId: blog.sanityId,
        authorId: blog.authorId,
        createdBy: userId,
    });

    return AppResponse(res, 201, blog, "Blog created successfully");
});
