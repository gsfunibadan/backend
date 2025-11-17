import { z } from "zod";

export const getAuthorSchema = z.object({
    authorId: z.string("Invalid author ID format").describe("ID of the author to retrieve"),
});

export type GetAuthorParams = z.infer<typeof getAuthorSchema>;
