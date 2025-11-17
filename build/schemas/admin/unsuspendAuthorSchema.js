"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsuspendAuthorSchema = void 0;
const zod_1 = require("zod");
exports.unsuspendAuthorSchema = zod_1.z.object({
    authorId: zod_1.z.string().uuid("Author ID must be a valid UUID"),
});
