"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlogStatsSchema = void 0;
const zod_1 = require("zod");
exports.getBlogStatsSchema = zod_1.z.object({
    blogId: zod_1.z.string().min(1, "Blog ID is required"),
});
