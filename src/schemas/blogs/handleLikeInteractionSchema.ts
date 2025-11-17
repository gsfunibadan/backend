import { z } from "zod";

export const handleLikeInteractionSchema = z.object({
    blogId: z.string().min(1, "Blog ID is required"),
});
