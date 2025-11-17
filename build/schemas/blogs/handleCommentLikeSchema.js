"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCommentLikeSchema = void 0;
const zod_1 = require("zod");
exports.handleCommentLikeSchema = zod_1.z.object({
    commentId: zod_1.z.string().min(1, "Invalid comment ID"),
});
