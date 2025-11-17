import { Response } from "express";
import { AuthRequest } from "../../common/constants";
import { catchAsync } from "../../utils/catchAsync";
import { approveAuthorSchema } from "../../schemas/admin/approveAuthorSchema";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { AppError } from "../../utils/appError";
import { prisma } from "../../database/prisma";
import { AppResponse } from "../../utils/appResponse";
import { sendAuthorApprovedEmail } from "../../utils/emails/emailHandlers";

export const approveAuthor = catchAsync(async (req: AuthRequest, res: Response) => {
    // 1. Authorization check
    console.log(req.admin);
    if (!req.admin) {
        throw new AppError("Admin authentication required", 403);
    }

    // 2. Validate request body
    const validationResult = approveAuthorSchema.safeParse(req.params);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { authorId } = validationResult.data;
    const adminId = req.admin.id;

    // 3. Fetch author with user details
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
                    isDeleted: true,
                },
            },
        },
    });

    if (!author) {
        throw new AppError("Author not found", 404);
    }

    // 4. Validation checks
    if (author.isDeleted) {
        throw new AppError("Cannot approve a deleted author", 400);
    }

    if (author.user.isDeleted) {
        throw new AppError("Cannot approve an author whose user account is deleted", 400);
    }

    // Can approve from PENDING, REJECTED, or suspended APPROVED authors
    if (author.status === "APPROVED" && !author.isSuspended) {
        throw new AppError("Author is already approved and active", 400);
    }

    // Only allow approval from valid states
    const canApprove =
        author.status === "PENDING" ||
        author.status === "REJECTED" ||
        (author.status === "APPROVED" && author.isSuspended);

    if (!canApprove) {
        throw new AppError(`Cannot approve author with current status: ${author.status}`, 400);
    }

    // 5. Approve author in transaction
    const approvedAuthor = await prisma.$transaction(async (tx) => {
        const isReapproval = author.status === "REJECTED";
        const isUnsuspension = author.status === "APPROVED" && author.isSuspended;

        // Update author status
        const updated = await tx.author.update({
            where: { id: authorId },
            data: {
                status: "APPROVED",
                approvedAt: new Date(),
                reviewedBy: adminId,
                reviewedAt: new Date(),
                // Clear rejection fields if re-approving
                rejectedAt: null,
                rejectionReason: null,
                // Clear suspension if applicable
                isSuspended: false,
                // Keep suspension history for audit
            },
            select: {
                id: true,
                userId: true,
                status: true,
                approvedAt: true,
                reviewedBy: true,
                isSuspended: true,
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

        // Determine activity action
        let activityAction = "APPROVED_AUTHOR";
        if (isReapproval) {
            activityAction = "RE_APPROVED_AUTHOR";
        } else if (isUnsuspension) {
            activityAction = "UNSUSPENDED_AUTHOR";
        }

        if (activityAction == "APPROVED_AUTHOR") {
            sendAuthorApprovedEmail(author.user.email, author.user.firstName);
        }

        // Create activity log
        await tx.adminActivityLog.create({
            data: {
                adminId,
                action: activityAction,
                entity: "Author",
                entityId: authorId,
                metadata: {
                    authorUserId: author.userId,
                    authorName: `${author.user.firstName} ${author.user.lastName}`,
                    authorEmail: author.user.email,
                    authorUsername: author.user.userName,
                    previousStatus: author.status,
                    wasSuspended: author.isSuspended,
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
                status: approvedAuthor.status,
                approvedAt: approvedAuthor.approvedAt,
                reviewedBy: approvedAuthor.reviewedBy,
                isSuspended: approvedAuthor.isSuspended,
                user: {
                    name: `${approvedAuthor.user.firstName} ${approvedAuthor.user.lastName}`,
                    email: approvedAuthor.user.email,
                    userName: approvedAuthor.user.userName,
                },
            },
        },
        "Author approved successfully"
    );
});
