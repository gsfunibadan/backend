"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGenericViewCountSchema = void 0;
const zod_1 = require("zod");
exports.updateGenericViewCountSchema = zod_1.z.object({
    blogId: zod_1.z.string().min(2, "Blog Id is required"),
});
