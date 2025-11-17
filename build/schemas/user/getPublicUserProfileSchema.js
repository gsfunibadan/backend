"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicUserProfileSchema = void 0;
const zod_1 = require("zod");
exports.getPublicUserProfileSchema = zod_1.z.object({
    userName: zod_1.z.string().min(1, "Username is required").max(50, "Username is too long"),
});
