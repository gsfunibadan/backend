import { z } from "zod";

export const getPendingBlogsSchema = z.object({
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
    order: z.enum(["asc", "desc"]).optional().default("desc"),
});
