"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthorRecentPostsSchema = void 0;
const zod_1 = require("zod");
exports.getAuthorRecentPostsSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .default("1")
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().int().min(1, "Page must be at least 1")),
    limit: zod_1.z
        .string()
        .optional()
        .default("6")
        .transform((val) => parseInt(val, 10))
        .pipe(
            zod_1.z
                .number()
                .int()
                .min(1, "Limit must be at least 1")
                .max(50, "Limit cannot exceed 50")
        ),
});
