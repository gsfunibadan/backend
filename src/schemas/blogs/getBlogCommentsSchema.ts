import z from "zod";

export const getBlogCommentsSchema = z.object({
    blogId: z.string().uuid("Invalid blog ID"),
    page: z
        .string()
        .optional()
        .default("1")
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().min(1, "Page must be at least 1")),
    limit: z
        .string()
        .optional()
        .default("5")
        .transform((val) => parseInt(val, 10))
        .pipe(
            z.number().int().min(1, "Limit must be at least 1").max(50, "Limit cannot exceed 50")
        ),
});
