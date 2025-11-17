"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveAuthorSchema = void 0;
const zod_1 = require("zod");
exports.approveAuthorSchema = zod_1.z.object({
    authorId: zod_1.z
        .string("Author ID must be a valid UUID")
        .describe("ID of the author to approve"),
});
