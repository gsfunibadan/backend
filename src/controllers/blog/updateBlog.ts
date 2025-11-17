import { Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { AuthRequest } from "../../common/constants";
import { updateBlogSchema } from "../../schemas/blogs/updateBlogSchema";

//This one real simple bro, all we doing here is for example when a blog is edited or something like that let's say the title was edited, we need to also change the slug to reflect that
export const updateBlog = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AppError("Authentication required", 401);
    }

    const { blogId } = req.params;
    if (!blogId) {
        throw new AppError("Blog ID is required", 400);
    }

    const validationResult = updateBlogSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { sanitySlug } = validationResult.data;

    const existingBlog = await prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            isDeleted: true,
            authorId: true,
        },
    });

    if (!existingBlog || existingBlog.isDeleted) {
        throw new AppError("Blog not found", 404);
    }

    const author = await prisma.author.findUnique({
        where: { id: existingBlog.authorId },
        select: { userId: true },
    });

    if (!author || author.userId !== userId) {
        throw new AppError("You can only update your own blogs", 403);
    }

    const updatedBlog = await prisma.blog.update({
        where: { id: blogId },
        data: {
            sanitySlug,
            publishedAt: new Date(),
            sanityUpdatedAt: new Date(),
            lastSyncedAt: new Date(),
            lastSyncedBy: userId,
        },
        include: {
            author: {
                select: {
                    id: true,
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

    logger.info("Blog updated successfully", {
        blogId: updatedBlog.id,
        newSlug: sanitySlug,
        updatedBy: userId,
    });

    return AppResponse(res, 200, updatedBlog, "Blog updated successfully");
});
