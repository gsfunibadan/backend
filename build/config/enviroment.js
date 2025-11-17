"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.loadEnvironment = loadEnvironment;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    PORT: zod_1.z.coerce.number().default(3000),
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: zod_1.z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    EMAIL_HOST: zod_1.z.string().min(1, "EMAIL_HOST is required"),
    EMAIL_SECURE: zod_1.z
        .string()
        .transform((val) => val === "true")
        .default(false),
    EMAIL_USER: zod_1.z.email("EMAIL_USER must be a valid email"),
    EMAIL_PASSWORD: zod_1.z.string().min(1, "EMAIL_PASSWORD is required"),
    ACCESS_TOKEN_SECRET: zod_1.z
        .string()
        .min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
    REFRESH_TOKEN_SECRET: zod_1.z
        .string()
        .min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
    ACCESS_TOKEN_EXPIRY: zod_1.z.string().default("15m"),
    REFRESH_TOKEN_EXPIRY: zod_1.z.string().default("7d"),
    FRONTEND_URL: zod_1.z.string().min(10),
    SANITY_TOKEN: zod_1.z.string().min(10, "Sanity Token is required"),
});
let cachedEnv = null;
function loadEnvironment() {
    if (cachedEnv) return cachedEnv;
    try {
        cachedEnv = envSchema.parse(process.env);
        return cachedEnv;
    } catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error("❌ Environment validation failed:");
            error.issues.forEach((err) => {
                console.error(`   ${err.path.join(".")}: ${err.message}`);
            });
        }
        throw error;
    }
}
exports.env = loadEnvironment();
