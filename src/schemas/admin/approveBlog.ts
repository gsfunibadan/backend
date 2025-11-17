import { z } from "zod";

export const approveBlogschema = z.object({
    blogId: z.string().min(1, "Blog Id is required"),
});

export type ApproveBlogInput = z.infer<typeof approveBlogschema>;
