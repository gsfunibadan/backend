import { z } from "zod";

export const unapproveBlogschema = z.object({
    blogId: z.string().min(1, "Blog Id is required"),
    reason: z.string().min(5, "A Valid and Geniune reason is needed").trim(),
});

export type UnApproveBlogInput = z.infer<typeof unapproveBlogschema>;
