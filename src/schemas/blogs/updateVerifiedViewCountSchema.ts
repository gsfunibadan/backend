import { z } from "zod";

export const updateVerifiedViewCountSchema = z.object({
    sanitySlug: z.string().min(1, "Sanity slug is required").max(200, "Sanity slug is too long"),
});
