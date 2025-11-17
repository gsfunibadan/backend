import { z } from "zod";

export const handleCommentLikeSchema = z.object({
    commentId: z.string().min(1, "Invalid comment ID"),
});
