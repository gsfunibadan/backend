"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminInvitationsSchema = void 0;
const zod_1 = require("zod");
exports.getAdminInvitationsSchema = zod_1.z.object({
    status: zod_1.z
        .enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"])
        .optional()
        .describe("Filter invitations by status"),
    email: zod_1.z
        .email("Invalid email format")
        .trim()
        .toLowerCase()
        .optional()
        .describe("Search invitations by email"),
    sentAfter: zod_1.z
        .date("Invalid date format. Use ISO 8601 format")
        .transform((val) => new Date(val))
        .optional()
        .describe("Filter invitations sent after this date"),
    sentBefore: zod_1.z
        .date("Invalid date format. Use ISO 8601 format")
        .transform((val) => new Date(val))
        .optional()
        .describe("Filter invitations sent before this date"),
    sortBy: zod_1.z
        .enum(["sentAt", "expiresAt", "email", "status"])
        .default("sentAt")
        .describe("Field to sort by"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc").describe("Sort order"),
    page: zod_1.z
        .string()
        .transform(Number)
        .pipe(zod_1.z.number().int().positive())
        .default(1)
        .describe("Page number for pagination"),
    limit: zod_1.z
        .string()
        .regex(/^\d+$/, "Limit must be a positive integer")
        .transform(Number)
        .pipe(zod_1.z.number().int().positive().max(100, "Maximum limit is 100"))
        .default(20)
        .describe("Number of items per page (max 100)"),
});
