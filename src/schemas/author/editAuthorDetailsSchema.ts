import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

const phoneValidator = z
    .string()
    .refine((phone) => isValidPhoneNumber(phone, "NG"), {
        message: "Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)",
    })
    .optional();

const bioValidator = z.string().min(10, "Bio must be at least 10 characters").trim().optional();

const socialSchema = z.object({
    platform: z.string().min(1, "Platform is required"),
    url: z.url("Must be a valid URL"),
    handle: z.string().optional(),
});

export const editAuthorProfileSchema = z.object({
    firstName: z.string().min(3, "First name must be at least 3 letters").trim().optional(),
    lastName: z.string().min(3, "Last name must be at least 3 letters").trim().optional(),
    phoneNumber: phoneValidator,
    bio: bioValidator,

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
        .pipe(z.array(socialSchema).max(5, "Maximum 5 social links allowed").optional())
        .optional(),
});

export type EditAuthorProfileSchemaData = z.infer<typeof editAuthorProfileSchema>;
