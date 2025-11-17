import { Response } from "express";
import { AuthRequest } from "../../common/constants";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { getAdminInvitationsSchema } from "../../schemas/admin/getAdminInvitationsSchema";
import { formatZodErrors } from "../../utils/formatZodErrors";
import { prisma } from "../../database/prisma";
import { AppResponse } from "../../utils/appResponse";
import { Prisma } from "@prisma/client";

export const getAdminInvites = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.admin) {
        throw new AppError("Admin authentication required", 403);
    }

    const validationResult = getAdminInvitationsSchema.safeParse(req.query);
    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Invalid query parameters", 400, formattedErrors);
    }

    const { status, page, limit } = validationResult.data;

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: Prisma.AdminInvitationWhereInput = {
        invitedBy: req.admin.id,
        ...(status && { status }),
    };

    const [invitations, totalCount] = await Promise.all([
        prisma.adminInvitation.findMany({
            where: whereClause,
            skip,
            take: limitNum,
            orderBy: { sentAt: "desc" },
            select: {
                id: true,
                email: true,
                status: true,
                sentAt: true,
                expiresAt: true,
                acceptedAt: true,
                revokedAt: true,
                revokeReason: true,
                inviter: {
                    select: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                userName: true,
                            },
                        },
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        userName: true,
                    },
                },
            },
        }),
        prisma.adminInvitation.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return AppResponse(
        res,
        200,
        {
            invitations,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1,
            },
        },
        "Admin invitations retrieved successfully"
    );
});
