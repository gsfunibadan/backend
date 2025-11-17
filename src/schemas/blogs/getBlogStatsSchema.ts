import { z } from "zod";

export const getBlogStatsSchema = z.object({
    blogId: z.string().min(1, "Blog ID is required"),
});
