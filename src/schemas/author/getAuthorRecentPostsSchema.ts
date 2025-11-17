import { z } from "zod";

export const getAuthorRecentPostsSchema = z.object({
    page: z
        .string()
        .optional()
        .default("1")
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().min(1, "Page must be at least 1")),
    limit: z
        .string()
        .optional()
        .default("6")
        .transform((val) => parseInt(val, 10))
        .pipe(
            z.number().int().min(1, "Limit must be at least 1").max(50, "Limit cannot exceed 50")
        ),
});
