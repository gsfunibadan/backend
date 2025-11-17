"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectAuthorSchema = void 0;
const zod_1 = require("zod");
exports.rejectAuthorSchema = zod_1.z.object({
    authorId: zod_1.z
        .string("Author ID must be a valid UUID")
        .describe("ID of the author to reject"),
    reason: zod_1.z
        .string()
        .min(10, "Rejection reason must be at least 10 characters")
        .max(500, "Rejection reason must not exceed 500 characters")
        .trim()
        .describe("Reason for rejecting the author"),
});
