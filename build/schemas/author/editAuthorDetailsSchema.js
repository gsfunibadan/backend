"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editAuthorProfileSchema = void 0;
const zod_1 = require("zod");
const libphonenumber_js_1 = require("libphonenumber-js");
const phoneValidator = zod_1.z
    .string()
    .refine((phone) => (0, libphonenumber_js_1.isValidPhoneNumber)(phone, "NG"), {
        message: "Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)",
    })
    .optional();
const bioValidator = zod_1.z
    .string()
    .min(10, "Bio must be at least 10 characters")
    .trim()
    .optional();
const socialSchema = zod_1.z.object({
    platform: zod_1.z.string().min(1, "Platform is required"),
    url: zod_1.z.url("Must be a valid URL"),
    handle: zod_1.z.string().optional(),
});
exports.editAuthorProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(3, "First name must be at least 3 letters").trim().optional(),
    lastName: zod_1.z.string().min(3, "Last name must be at least 3 letters").trim().optional(),
    phoneNumber: phoneValidator,
    bio: bioValidator,
    socials: zod_1.z
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
        .pipe(zod_1.z.array(socialSchema).max(5, "Maximum 5 social links allowed").optional())
        .optional(),
});
