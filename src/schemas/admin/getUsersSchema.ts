import z from "zod";

export const getUsersSchema = z.object({
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
        .transform((val) => (val ? val.trim() : undefined)),
    sortBy: z
        .enum(["createdAt", "userName", "email", "firstName", "lastName"])
        .optional()
        .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
    isVerified: z
        .string()
        .optional()
        .transform((val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            return undefined;
        }),
    isDeleted: z
        .string()
        .optional()
        .default("false")
        .transform((val) => val === "true"),
    authProvider: z.enum(["LOCAL", "GOOGLE"]).optional(),
    role: z.enum(["user", "author", "admin"]).optional(),
});
