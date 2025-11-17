import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

export const editProfileSchema = z.object({
    userName: z.string().min(1, "Username is required").max(50, "Username is too long").optional(),
    firstName: z
        .string()
        .min(2, "First name must be at least 2 characters long")
        .max(100, "First name is too long")
        .optional(),
    lastName: z
        .string()
        .min(2, "Last name must be at least 2 characters long")
        .max(100, "Last name is too long")
        .optional(),
    email: z.email("Invalid email address").optional(),
    phoneNumber: z
        .string()
        .refine((phone) => isValidPhoneNumber(phone, "NG"), {
            message:
                "Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)",
        })
        .optional(),

    bio: z.string().max(200, "Bio is too long").optional(),
});
