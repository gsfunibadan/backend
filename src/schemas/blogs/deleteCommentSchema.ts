import { z } from "zod";

export const deleteCommentSchema = z.object({
    commentId: z.string().min(1, "Invalid comment ID"),
});
