"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.editProfileSchema = void 0;
const libphonenumber_js_1 = require("libphonenumber-js");
const zod_1 = __importDefault(require("zod"));
exports.editProfileSchema = zod_1.default.object({
    userName: zod_1.default
        .string()
        .min(1, "Username is required")
        .max(50, "Username is too long")
        .optional(),
    firstName: zod_1.default
        .string()
        .min(2, "First name must be at least 2 characters long")
        .max(100, "First name is too long")
        .optional(),
    lastName: zod_1.default
        .string()
        .min(2, "Last name must be at least 2 characters long")
        .max(100, "Last name is too long")
        .optional(),
    email: zod_1.default.email("Invalid email address").optional(),
    phoneNumber: zod_1.default
        .string()
        .refine((phone) => (0, libphonenumber_js_1.isValidPhoneNumber)(phone, "NG"), {
            message:
                "Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)",
        })
        .optional(),
    bio: zod_1.default.string().max(200, "Bio is too long").optional(),
});
