import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const signupSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters").trim(),
    lastName: z.string().min(2, "Last name must be at least 2 characters").trim(),
    username: z.string().min(2, "user name must be at least 4 characters").trim(),
    email: z.email("Please enter a valid email address").trim(),
    phoneNumber: z
        .string()
        .trim()
        .refine(
            (phone) => {
                try {
                    return isValidPhoneNumber(phone, "NG");
                } catch {
                    return false;
                }
            },
            {
                message:
                    "Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)",
            }
        ),
    acceptTerms: z.boolean().refine((val) => val === true, {
        message: "You must accept the terms anc conditions that apply",
    }),
    password: z
        .string()
        .trim()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export type SignupFormData = z.infer<typeof signupSchema>;
