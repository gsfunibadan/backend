import { z } from "zod";

export const suspendAuthorSchema = z.object({
    authorId: z
        .string("Author Must have a valid ID")

        .describe("ID of the author to suspend"),

    reason: z
        .string()
        .min(10, "Suspension reason must be at least 10 characters")
        .max(500, "Suspension reason must not exceed 500 characters")
        .trim()
        .describe("Reason for suspending the author"),
});

export type SuspendAuthorInput = z.infer<typeof suspendAuthorSchema>;
