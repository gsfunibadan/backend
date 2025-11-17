import { z } from "zod";

export const addCommentSchema = z.object({
    content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment is too long").trim(),
    blogId: z.string().min(1, "Invalid blog ID"),
    parentId: z.string().min(1, "Invalid parent comment ID").optional(),
    replyingToUserId: z.string().min(1, "Invalid user ID").optional(),
    replyingToUserName: z.string().max(100).optional(),
});
