import { z } from "zod";

export const updateBlogSchema = z
    .object({
        sanitySlug: z.string().min(1).optional(),
        publishedAt: z.date().optional(),
        sanityUpdatedAt: z.date().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    });
