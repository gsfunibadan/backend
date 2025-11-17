import { Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppResponse } from "../../utils/appResponse";
import { prisma } from "../../database/prisma";
import { AuthRequest } from "../../common/constants";
import { approveBlogschema } from "../../schemas/admin/approveBlog";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";

export const approveBlog = catchAsync(async (req: AuthRequest, res: Response) => {
    const validationResult = approveBlogschema.safeParse(req.params);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { blogId } = validationResult.data;

    if (!req.admin) {
        throw new AppError("Only Admins can perform this action", 403);
    }

    const adminId = req.admin.id;

    const blog = await prisma.blog.findUnique({
        where: { id: blogId },
        select: {
            id: true,
            sanitySlug: true,
            isApproved: true,
            isDeleted: true,
            author: {
                select: {
                    user: {
                        select: { userName: true, email: true },
                    },
                },
            },
        },
    });

    if (!blog) {
        throw new AppError("Blog does not exist", 404);
    }

    if (blog.isDeleted) {
        throw new AppError("Cannot approve a deleted blog", 400);
    }

    if (blog.isApproved) {
        throw new AppError("Blog is already approved", 400);
    }

    // eslint-disable-next-line
    const [updatedBlog, _activityLog] = await prisma.$transaction([
        prisma.blog.update({
            where: { id: blogId },
            data: {
                isApproved: true,
                approvedBy: adminId,
                approvedAt: new Date(),

                lastUnapprovedBy: null,
                lastUnapprovedAt: null,
                unapprovalReason: null,
            },
            select: {
                id: true,
                sanitySlug: true,
                isApproved: true,
                approvedBy: true,
                approvedAt: true,
                author: {
                    select: {
                        user: {
                            select: { userName: true, firstName: true, lastName: true },
                        },
                    },
                },
            },
        }),

        prisma.adminActivityLog.create({
            data: {
                adminId,
                action: "APPROVED_BLOG",
                entity: "Blog",
                entityId: blogId,
                metadata: {
                    blogSlug: blog.sanitySlug,
                    authorUsername: blog.author.user.userName,
                },
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            },
        }),
    ]);

    return AppResponse(
        res,
        200,
        {
            blog: updatedBlog,
            message: `Blog "${blog.id}" approved successfully`,
        },
        "Blog approved successfully"
    );
});
