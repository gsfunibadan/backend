"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNewBlogSchema = void 0;
const zod_1 = require("zod");
exports.createNewBlogSchema = zod_1.z.object({
    sanityId: zod_1.z.string().min(1, "Sanity ID is required"),
    sanitySlug: zod_1.z.string().min(1, "Sanity slug is required"),
    authorId: zod_1.z.string().min(2, "Invalid author ID format"),
});
