"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBlogSchema = void 0;
const zod_1 = require("zod");
exports.updateBlogSchema = zod_1.z
    .object({
        sanitySlug: zod_1.z.string().min(1).optional(),
        publishedAt: zod_1.z.date().optional(),
        sanityUpdatedAt: zod_1.z.date().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    });
