import { z } from "zod";

export const signinSchema = z.object({
    username: z.string().min(1, "Username is required").trim(),
    password: z.string().min(1, "Password is required"),
});

export type SigninInput = z.infer<typeof signinSchema>;
