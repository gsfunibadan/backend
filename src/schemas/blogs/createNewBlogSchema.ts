import { z } from "zod";

export const createNewBlogSchema = z.object({
    sanityId: z.string().min(1, "Sanity ID is required"),
    sanitySlug: z.string().min(1, "Sanity slug is required"),
    authorId: z.string().min(2, "Invalid author ID format"),
});
