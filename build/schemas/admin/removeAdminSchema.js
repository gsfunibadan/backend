"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAdminSchema = void 0;
const zod_1 = require("zod");
exports.removeAdminSchema = zod_1.z.object({
    adminId: zod_1.z
        .string()
        .min(1, "A valid Admin ID must be provided")
        .describe("ID of the admin to remove"),
    reason: zod_1.z
        .string()
        .min(10, "Reason must be at least 10 characters")
        .max(500, "Reason must not exceed 500 characters")
        .trim()
        .describe("Reason for removing the admin"),
});
