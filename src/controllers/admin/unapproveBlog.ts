import { Response } from "express";
import { AuthRequest } from "../../common/constants";
import { catchAsync } from "../../utils/catchAsync";
import { unapproveBlogschema } from "../../schemas/admin/unapproveBlog";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";
import { prisma } from "../../database/prisma";
import { AppResponse } from "../../utils/appResponse";

export const unapproveBlog = catchAsync(async (req: AuthRequest, res: Response) => {
    const validationResult = unapproveBlogschema.safeParse({ ...req.params, ...req.body });
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    if (!req.admin) {
        throw new AppError("Admin authentication required", 401);
    }

    const adminId = req.admin.id;
    const { blogId, reason } = validationResult.data;
    // Validate reason
    if (!reason || reason.trim().length === 0) {
        throw new AppError("Unapproval reason is required", 400);
    }

    if (reason.trim().length < 10) {
        throw new AppError("Unapproval reason must be at least 10 characters", 400);
    }

    // Check if blog exists
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
        throw new AppError("Blog not found", 404);
    }

    if (blog.isDeleted) {
        throw new AppError("Cannot unapprove a deleted blog", 400);
    }

    if (!blog.isApproved) {
        throw new AppError("Blog is not currently approved", 400);
    }

    // eslint-disable-next-line
    const [updatedBlog, _activityLog] = await prisma.$transaction([
        prisma.blog.update({
            where: { id: blogId },
            data: {
                isApproved: false,
                approvedBy: null,
                approvedAt: null,
                lastUnapprovedBy: adminId,
                lastUnapprovedAt: new Date(),
                unapprovalReason: reason.trim(),
            },
            select: {
                id: true,
                sanitySlug: true,
                isApproved: true,
                lastUnapprovedBy: true,
                lastUnapprovedAt: true,
                unapprovalReason: true,
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
                action: "UNAPPROVED_BLOG",
                entity: "Blog",
                entityId: blogId,
                metadata: {
                    blogSlug: blog.sanitySlug,
                    reason: reason.trim(),
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
            message: `Blog "${blog.sanitySlug}" unapproved`,
        },
        "Blog unapproved successfully"
    );
});
