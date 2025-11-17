import { z } from "zod";

export const getAdminInvitationsSchema = z.object({
    status: z
        .enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"])
        .optional()
        .describe("Filter invitations by status"),

    email: z

        .email("Invalid email format")
        .trim()
        .toLowerCase()
        .optional()
        .describe("Search invitations by email"),

    sentAfter: z

        .date("Invalid date format. Use ISO 8601 format")
        .transform((val) => new Date(val))
        .optional()
        .describe("Filter invitations sent after this date"),

    sentBefore: z

        .date("Invalid date format. Use ISO 8601 format")
        .transform((val) => new Date(val))
        .optional()
        .describe("Filter invitations sent before this date"),

    sortBy: z
        .enum(["sentAt", "expiresAt", "email", "status"])
        .default("sentAt")
        .describe("Field to sort by"),

    sortOrder: z.enum(["asc", "desc"]).default("desc").describe("Sort order"),

    page: z
        .string()

        .transform(Number)
        .pipe(z.number().int().positive())
        .default(1)
        .describe("Page number for pagination"),

    limit: z
        .string()
        .regex(/^\d+$/, "Limit must be a positive integer")
        .transform(Number)
        .pipe(z.number().int().positive().max(100, "Maximum limit is 100"))
        .default(20)
        .describe("Number of items per page (max 100)"),
});
