"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthorsSchema = void 0;
const zod_1 = require("zod");
exports.getAuthorsSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .default("1")
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().int().min(1, "Page must be at least 1")),
    limit: zod_1.z
        .string()
        .optional()
        .default("20")
        .transform((val) => parseInt(val, 10))
        .pipe(
            zod_1.z
                .number()
                .int()
                .min(1, "Limit must be at least 1")
                .max(100, "Limit cannot exceed 100")
        ),
    search: zod_1.z
        .string()
        .max(100, "Search query too long")
        .optional()
        .transform((val) => (val ? val.trim() : undefined))
        .describe("Search by author name, email, or username"),
    status: zod_1.z
        .enum(["PENDING", "APPROVED", "REJECTED"])
        .optional()
        .describe("Filter by author status"),
    isSuspended: zod_1.z
        .string()
        .optional()
        .transform((val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            return undefined;
        })
        .describe("Filter by suspension status"),
    isDeleted: zod_1.z
        .string()
        .optional()
        .default("false")
        .transform((val) => val === "true")
        .describe("Include deleted authors"),
    sortBy: zod_1.z
        .enum(["createdAt", "appliedAt", "approvedAt", "userName", "email"])
        .optional()
        .default("createdAt")
        .describe("Field to sort by"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).optional().default("desc").describe("Sort order"),
    appliedAfter: zod_1.z
        .date("Invalid date format. Use ISO 8601 format")
        .transform((val) => new Date(val))
        .optional()
        .describe("Filter authors who applied after this date"),
    appliedBefore: zod_1.z
        .date("Invalid date format. Use ISO 8601 format")
        .transform((val) => new Date(val))
        .optional()
        .describe("Filter authors who applied before this date"),
});
