"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlogsSchema = void 0;
const zod_1 = require("zod");
exports.getBlogsSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .default("1")
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().int().min(1, "Page must be at least 1")),
    limit: zod_1.z
        .string()
        .optional()
        .default("12")
        .transform((val) => parseInt(val, 10))
        .pipe(
            zod_1.z
                .number()
                .int()
                .min(1, "Limit must be at least 1")
                .max(50, "Limit cannot exceed 50")
        ),
    search: zod_1.z
        .string()
        .max(100, "Search query too long")
        .optional()
        .transform((val) => (val ? val.trim() : undefined)),
    sortBy: zod_1.z
        .enum(["publishedAt", "views", "likes", "comments"])
        .optional()
        .default("publishedAt"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).optional().default("desc"),
});
