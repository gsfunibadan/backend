import { z } from "zod";

export const getBlogsSchema = z.object({
    page: z
        .string()
        .optional()
        .default("1")
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().min(1, "Page must be at least 1")),
    limit: z
        .string()
        .optional()
        .default("12")
        .transform((val) => parseInt(val, 10))
        .pipe(
            z.number().int().min(1, "Limit must be at least 1").max(50, "Limit cannot exceed 50")
        ),
    search: z
        .string()
        .max(100, "Search query too long")
        .optional()
        .transform((val) => (val ? val.trim() : undefined)),
    sortBy: z.enum(["publishedAt", "views", "likes", "comments"]).optional().default("publishedAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
