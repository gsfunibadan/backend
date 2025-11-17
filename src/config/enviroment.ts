import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(8000),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    EMAIL_SERVICE_URL: z.string().min(1, "EMAIL_SERVICE_URL  is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

    EMAIL_HOST: z.string().min(1, "EMAIL_HOST is required"),

    EMAIL_SECURE: z
        .string()
        .transform((val) => val === "true")
        .default(false),
    EMAIL_USER: z.email("EMAIL_USER must be a valid email"),
    EMAIL_PASSWORD: z.string().min(1, "EMAIL_PASSWORD is required"),

    ACCESS_TOKEN_SECRET: z.string().min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
    REFRESH_TOKEN_SECRET: z.string().min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
    ACCESS_TOKEN_EXPIRY: z.string().default("15m"),
    REFRESH_TOKEN_EXPIRY: z.string().default("7d"),
    FRONTEND_URL: z.string().min(10),

    SANITY_TOKEN: z.string().min(10, "Sanity Token is required"),
});

export type Environment = z.infer<typeof envSchema>;

let cachedEnv: Environment | null = null;

export function loadEnvironment(): Environment {
    if (cachedEnv) return cachedEnv;

    try {
        cachedEnv = envSchema.parse(process.env);
        return cachedEnv;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("❌ Environment validation failed:");
            error.issues.forEach((err) => {
                console.error(`   ${err.path.join(".")}: ${err.message}`);
            });
        }
        throw error;
    }
}

export const env = loadEnvironment();
