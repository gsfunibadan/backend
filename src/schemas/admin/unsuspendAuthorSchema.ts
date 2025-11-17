import { z } from "zod";

export const unsuspendAuthorSchema = z.object({
    authorId: z.string().uuid("Author ID must be a valid UUID"),
});

export type UnsuspendAuthorInput = z.infer<typeof unsuspendAuthorSchema>;
