import { Response } from "express";
import { AuthRequest } from "../../common/constants";
import { catchAsync } from "../../utils/catchAsync";
import { suspendAuthorSchema } from "../../schemas/admin/suspendAuthorSchema";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";
import { prisma } from "../../database/prisma";
import { AppResponse } from "../../utils/appResponse";

export const suspendAuthor = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.admin) {
        throw new AppError("Admin authentication required", 403);
    }

    const validationResult = suspendAuthorSchema.safeParse({
        ...req.body,
        ...req.params,
    });
    console.log(req.params);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { authorId, reason } = validationResult.data;
    const adminId = req.admin.id;

    const author = await prisma.author.findUnique({
        where: { id: authorId },
        select: {
            id: true,
            userId: true,
            status: true,
            isDeleted: true,
            isSuspended: true,
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    userName: true,
                },
            },
            _count: {
                select: {
                    blogs: {
                        where: { isDeleted: false },
                    },
                },
            },
        },
    });

    if (!author) {
        throw new AppError("Author not found", 404);
    }

    if (author.isDeleted) {
        throw new AppError("Cannot suspend a deleted author", 400);
    }

    if (author.status !== "APPROVED") {
        throw new AppError("Can only suspend APPROVED authors", 400);
    }

    if (author.isSuspended) {
        throw new AppError("Author is already suspended", 400);
    }

    const suspendedAuthor = await prisma.$transaction(async (tx) => {
        const updated = await tx.author.update({
            where: { id: authorId },
            data: {
                isSuspended: true,

                rejectionReason: `SUSPENDED: ${reason}`,
                reviewedBy: adminId,
                reviewedAt: new Date(),
            },
        });

        await tx.adminActivityLog.create({
            data: {
                adminId,
                action: "SUSPENDED_AUTHOR",
                entity: "Author",
                entityId: authorId,
                metadata: {
                    authorName: `${author.user.firstName} ${author.user.lastName}`,
                    authorEmail: author.user.email,
                    reason,
                    blogsCount: author._count.blogs,
                },
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            },
        });

        return {
            ...updated,
            blogsCount: author._count.blogs,
        };
    });

    return AppResponse(
        res,
        200,
        {
            author: {
                id: suspendedAuthor.id,
                status: suspendedAuthor.status,
                isSuspended: suspendedAuthor.isSuspended,
                blogsRemainVisible: suspendedAuthor.blogsCount,
            },
        },
        `Author suspended. ${suspendedAuthor.blogsCount} blog(s) remain visible.`
    );
});
