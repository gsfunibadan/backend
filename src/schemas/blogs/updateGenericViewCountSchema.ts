import { z } from "zod";

export const updateGenericViewCountSchema = z.object({
    blogId: z.string().min(2, "Blog Id is required"),
});
