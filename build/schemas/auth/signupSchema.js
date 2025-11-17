"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupSchema = void 0;
const zod_1 = require("zod");
const libphonenumber_js_1 = require("libphonenumber-js");
exports.signupSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2, "First name must be at least 2 characters").trim(),
    lastName: zod_1.z.string().min(2, "Last name must be at least 2 characters").trim(),
    username: zod_1.z.string().min(2, "user name must be at least 4 characters").trim(),
    email: zod_1.z.email("Please enter a valid email address").trim(),
    phoneNumber: zod_1.z
        .string()
        .trim()
        .refine(
            (phone) => {
                try {
                    return (0, libphonenumber_js_1.isValidPhoneNumber)(phone, "NG");
                } catch {
                    return false;
                }
            },
            {
                message:
                    "Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)",
            }
        ),
    acceptTerms: zod_1.z.boolean().refine((val) => val === true, {
        message: "You must accept the terms anc conditions that apply",
    }),
    password: zod_1.z
        .string()
        .trim()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});
