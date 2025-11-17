"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminInvites = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const appError_1 = require("../../utils/appError");
const getAdminInvitationsSchema_1 = require("../../schemas/admin/getAdminInvitationsSchema");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const prisma_1 = require("../../database/prisma");
const appResponse_1 = require("../../utils/appResponse");
exports.getAdminInvites = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.admin) {
        throw new appError_1.AppError("Admin authentication required", 403);
    }
    const validationResult = getAdminInvitationsSchema_1.getAdminInvitationsSchema.safeParse(
        req.query
    );
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Invalid query parameters", 400, formattedErrors);
    }
    const { status, page, limit } = validationResult.data;
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;
    const whereClause = {
        invitedBy: req.admin.id,
        ...(status && { status }),
    };
    const [invitations, totalCount] = await Promise.all([
        prisma_1.prisma.adminInvitation.findMany({
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
        prisma_1.prisma.adminInvitation.count({ where: whereClause }),
    ]);
    const totalPages = Math.ceil(totalCount / limitNum);
    return (0, appResponse_1.AppResponse)(
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
