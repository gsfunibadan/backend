import { z } from "zod";

export const approveAuthorSchema = z.object({
    authorId: z.string("Author ID must be a valid UUID").describe("ID of the author to approve"),
});

export type ApproveAuthorInput = z.infer<typeof approveAuthorSchema>;
