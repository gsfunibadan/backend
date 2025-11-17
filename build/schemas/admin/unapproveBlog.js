"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unapproveBlogschema = void 0;
const zod_1 = require("zod");
exports.unapproveBlogschema = zod_1.z.object({
    blogId: zod_1.z.string().min(1, "Blog Id is required"),
    reason: zod_1.z.string().min(5, "A Valid and Geniune reason is needed").trim(),
});
