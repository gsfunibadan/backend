"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCommentSchema = void 0;
const zod_1 = require("zod");
exports.addCommentSchema = zod_1.z.object({
    content: zod_1.z
        .string()
        .min(1, "Comment cannot be empty")
        .max(1000, "Comment is too long")
        .trim(),
    blogId: zod_1.z.string().min(1, "Invalid blog ID"),
    parentId: zod_1.z.string().min(1, "Invalid parent comment ID").optional(),
    replyingToUserId: zod_1.z.string().min(1, "Invalid user ID").optional(),
    replyingToUserName: zod_1.z.string().max(100).optional(),
});
