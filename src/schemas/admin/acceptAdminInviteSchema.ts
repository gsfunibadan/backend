import z from "zod";

export const acceptAdminInviteSchema = z.object({
    token: z.string().min(5, "Please use a valid invite token"),
});
