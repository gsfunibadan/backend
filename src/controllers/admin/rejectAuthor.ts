import { Response } from "express";
import { AuthRequest } from "../../common/constants";
import { catchAsync } from "../../utils/catchAsync";
import { rejectAuthorSchema } from "../../schemas/admin/rejectAuthorSchema";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";
import { prisma } from "../../database/prisma";
import { AppResponse } from "../../utils/appResponse";

export const rejectAuthor = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.admin) {
        throw new AppError("Admin authentication required", 403);
    }

    const validationResult = rejectAuthorSchema.safeParse(req.body);
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
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    userName: true,
                },
            },
        },
    });

    if (!author) {
        throw new AppError("Author not found", 404);
    }

    if (author.isDeleted) {
        throw new AppError("Cannot reject a deleted author", 400);
    }

    if (author.status === "REJECTED") {
        throw new AppError("Author is already rejected", 400);
    }

    const rejectedAuthor = await prisma.$transaction(async (tx) => {
        const updated = await tx.author.update({
            where: { id: authorId },
            data: {
                status: "REJECTED",
                rejectedAt: new Date(),
                rejectionReason: reason,
                reviewedBy: adminId,
                reviewedAt: new Date(),
                isSuspended: false,
            },
        });

        await tx.adminActivityLog.create({
            data: {
                adminId,
                action: "REJECTED_AUTHOR",
                entity: "Author",
                entityId: authorId,
                metadata: {
                    authorName: `${author.user.firstName} ${author.user.lastName}`,
                    authorEmail: author.user.email,
                    previousStatus: author.status,
                    reason,
                },
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
                id: rejectedAuthor.id,
                status: rejectedAuthor.status,
                rejectedAt: rejectedAuthor.rejectedAt,
            },
        },
        "Author rejected successfully"
    );
});
