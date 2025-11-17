"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVerifiedViewCountSchema = void 0;
const zod_1 = require("zod");
exports.updateVerifiedViewCountSchema = zod_1.z.object({
    sanitySlug: zod_1.z
        .string()
        .min(1, "Sanity slug is required")
        .max(200, "Sanity slug is too long"),
});
