import { z } from "zod";

export const getAuthorsSchema = z.object({
    page: z
        .string()
        .optional()
        .default("1")
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().min(1, "Page must be at least 1")),

    limit: z
        .string()
        .optional()
        .default("20")
        .transform((val) => parseInt(val, 10))
        .pipe(
            z.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100")
        ),

    search: z
        .string()
        .max(100, "Search query too long")
        .optional()
        .transform((val) => (val ? val.trim() : undefined))
        .describe("Search by author name, email, or username"),

    status: z
        .enum(["PENDING", "APPROVED", "REJECTED"])
        .optional()
        .describe("Filter by author status"),

    isSuspended: z
        .string()
        .optional()
        .transform((val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            return undefined;
        })
        .describe("Filter by suspension status"),

    isDeleted: z
        .string()
        .optional()
        .default("false")
        .transform((val) => val === "true")
        .describe("Include deleted authors"),

    sortBy: z
        .enum(["createdAt", "appliedAt", "approvedAt", "userName", "email"])
        .optional()
        .default("createdAt")
        .describe("Field to sort by"),

    sortOrder: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort order"),

    appliedAfter: z

        .date("Invalid date format. Use ISO 8601 format")
        .transform((val) => new Date(val))
        .optional()
        .describe("Filter authors who applied after this date"),

    appliedBefore: z

        .date("Invalid date format. Use ISO 8601 format")
        .transform((val) => new Date(val))
        .optional()
        .describe("Filter authors who applied before this date"),
});

export type GetAuthorsQuery = z.infer<typeof getAuthorsSchema>;
