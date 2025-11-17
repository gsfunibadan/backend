import { Response } from "express";
import { AuthRequest } from "../../common/constants";
import { catchAsync } from "../../utils/catchAsync";
import { unsuspendAuthorSchema } from "../../schemas/admin/unsuspendAuthorSchema";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";
import { prisma } from "../../database/prisma";
import { AppResponse } from "../../utils/appResponse";

export const unsuspendAuthor = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.admin) {
        throw new AppError("Admin authentication required", 403);
    }

    const validationResult = unsuspendAuthorSchema.safeParse(req.params);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { authorId } = validationResult.data;
    const adminId = req.admin.id;

    const author = await prisma.author.findUnique({
        where: { id: authorId },
        select: {
            id: true,
            status: true,
            isSuspended: true,
            isDeleted: true,
        },
    });

    if (!author) {
        throw new AppError("Author not found", 404);
    }

    if (author.isDeleted) {
        throw new AppError("Cannot unsuspend a deleted author", 400);
    }

    if (!author.isSuspended) {
        throw new AppError("Author is not suspended", 400);
    }

    const unsuspendedAuthor = await prisma.$transaction(async (tx) => {
        const updated = await tx.author.update({
            where: { id: authorId },
            data: {
                isSuspended: false,
                rejectionReason: null,
            },
        });

        await tx.adminActivityLog.create({
            data: {
                adminId,
                action: "UNSUSPENDED_AUTHOR",
                entity: "Author",
                entityId: authorId,
                metadata: {},
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            },
        });

        return updated;
    });

    return AppResponse(
        res,
        200,
        {
            author: {
                id: unsuspendedAuthor.id,
                status: unsuspendedAuthor.status,
                isSuspended: unsuspendedAuthor.isSuspended,
            },
        },
        "Author unsuspended successfully"
    );
});
