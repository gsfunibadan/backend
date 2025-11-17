import z from "zod";

export const resendVerificationTokenSchema = z.object({
    email: z.email("Invalid email address"),
});
