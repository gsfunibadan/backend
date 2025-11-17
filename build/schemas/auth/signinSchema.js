"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signinSchema = void 0;
const zod_1 = require("zod");
exports.signinSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, "Username is required").trim(),
    password: zod_1.z.string().min(1, "Password is required"),
});
