import { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { logger } from "../../utils/logger";
import { updateGenericViewCountSchema } from "../../schemas/blogs/updateGenericViewCountSchema";

interface GenericViewResult {
    sanitySlug: string;
    genericViewCount: number;
    blogId: string;
}

export const updateGenericViewCount = catchAsync(async (req: Request, res: Response) => {
    const validationResult = updateGenericViewCountSchema.safeParse(req.params);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { blogId } = validationResult.data;

    const blog = await prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            sanitySlug: true,
            genericViewCount: true,
            isDeleted: true,
            isApproved: true,
        },
    });

    if (!blog || blog.isDeleted || !blog.isApproved) {
        throw new AppError("Blog post not found", 404);
    }

    const updatedBlog = await prisma.blog.update({
        where: { id: blog.id },
        data: {
            genericViewCount: {
                increment: 1,
            },
        },
        select: {
            id: true,
            sanitySlug: true,
            genericViewCount: true,
        },
    });

    const result: GenericViewResult = {
        sanitySlug: updatedBlog.sanitySlug,
        genericViewCount: updatedBlog.genericViewCount,
        blogId: updatedBlog.id,
    };

    logger.info("Generic view count incremented", {
        blogId: updatedBlog.id,

        newCount: updatedBlog.genericViewCount,
    });

    return AppResponse(res, 200, result, "View count updated successfully");
});
