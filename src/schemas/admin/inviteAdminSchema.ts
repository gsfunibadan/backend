import z from "zod";

export const inviteAdminSchema = z.object({
    email: z.email("Please use a valid email").trim(),
});
