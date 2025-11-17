"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.getUsersSchema = zod_1.default.object({
    page: zod_1.default
        .string()
        .optional()
        .default("1")
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.default.number().int().min(1, "Page must be at least 1")),
    limit: zod_1.default
        .string()
        .optional()
        .default("20")
        .transform((val) => parseInt(val, 10))
        .pipe(
            zod_1.default
                .number()
                .int()
                .min(1, "Limit must be at least 1")
                .max(100, "Limit cannot exceed 100")
        ),
    search: zod_1.default
        .string()
        .max(100, "Search query too long")
        .optional()
        .transform((val) => (val ? val.trim() : undefined)),
    sortBy: zod_1.default
        .enum(["createdAt", "userName", "email", "firstName", "lastName"])
        .optional()
        .default("createdAt"),
    sortOrder: zod_1.default.enum(["asc", "desc"]).optional().default("desc"),
    isVerified: zod_1.default
        .string()
        .optional()
        .transform((val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            return undefined;
        }),
    isDeleted: zod_1.default
        .string()
        .optional()
        .default("false")
        .transform((val) => val === "true"),
    authProvider: zod_1.default.enum(["LOCAL", "GOOGLE"]).optional(),
    role: zod_1.default.enum(["user", "author", "admin"]).optional(),
});
