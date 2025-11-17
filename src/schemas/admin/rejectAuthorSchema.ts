import { z } from "zod";

export const rejectAuthorSchema = z.object({
    authorId: z.string("Author ID must be a valid UUID").describe("ID of the author to reject"),

    reason: z
        .string()
        .min(10, "Rejection reason must be at least 10 characters")
        .max(500, "Rejection reason must not exceed 500 characters")
        .trim()
        .describe("Reason for rejecting the author"),
});

export type RejectAuthorInput = z.infer<typeof rejectAuthorSchema>;
