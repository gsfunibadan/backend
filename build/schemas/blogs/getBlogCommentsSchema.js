"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlogCommentsSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.getBlogCommentsSchema = zod_1.default.object({
    blogId: zod_1.default.string().uuid("Invalid blog ID"),
    page: zod_1.default
        .string()
        .optional()
        .default("1")
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.default.number().int().min(1, "Page must be at least 1")),
    limit: zod_1.default
        .string()
        .optional()
        .default("5")
        .transform((val) => parseInt(val, 10))
        .pipe(
            zod_1.default
                .number()
                .int()
                .min(1, "Limit must be at least 1")
                .max(50, "Limit cannot exceed 50")
        ),
});
