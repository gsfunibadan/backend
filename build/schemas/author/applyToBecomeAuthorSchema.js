"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyToBecomeAuthorSchema = void 0;
const zod_1 = require("zod");
const socialSchema = zod_1.z.object({
    platform: zod_1.z.string().min(1, "Platform is required"),
    url: zod_1.z.url("Must be a valid URL"),
    handle: zod_1.z.string().optional(),
});
exports.applyToBecomeAuthorSchema = zod_1.z.object({
    bio: zod_1.z.string().min(10, "A short description of yourself").trim(),
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
        .pipe(zod_1.z.array(socialSchema).max(5, "Maximum 5 social links allowed").optional()),
});
