import { z } from "zod";

const socialSchema = z.object({
    platform: z.string().min(1, "Platform is required"),
    url: z.url("Must be a valid URL"),
    handle: z.string().optional(),
});

export const applyToBecomeAuthorSchema = z.object({
    bio: z.string().min(10, "A short description of yourself").trim(),
    socials: z
        .string()
        .optional()
        .transform((val) => {
            if (!val) return undefined;
            try {
                return JSON.parse(val);
            } catch {
                throw new Error("Invalid JSON format for socials");
            }
        })
        .pipe(z.array(socialSchema).max(5, "Maximum 5 social links allowed").optional()),
});

export type ApplyToBecomeAuthorSchemaData = z.infer<typeof applyToBecomeAuthorSchema>;
