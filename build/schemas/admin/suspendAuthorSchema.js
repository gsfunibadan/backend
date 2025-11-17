"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suspendAuthorSchema = void 0;
const zod_1 = require("zod");
exports.suspendAuthorSchema = zod_1.z.object({
    authorId: zod_1.z.string("Author Must have a valid ID").describe("ID of the author to suspend"),
    reason: zod_1.z
        .string()
        .min(10, "Suspension reason must be at least 10 characters")
        .max(500, "Suspension reason must not exceed 500 characters")
        .trim()
        .describe("Reason for suspending the author"),
});
