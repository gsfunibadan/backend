import { z } from "zod";

export const removeAdminSchema = z.object({
    adminId: z
        .string()
        .min(1, "A valid Admin ID must be provided")
        .describe("ID of the admin to remove"),

    reason: z
        .string()
        .min(10, "Reason must be at least 10 characters")
        .max(500, "Reason must not exceed 500 characters")
        .trim()
        .describe("Reason for removing the admin"),
});
