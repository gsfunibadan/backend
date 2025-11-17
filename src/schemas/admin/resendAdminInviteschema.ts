import z from "zod";

export const resendAdminInviteSchema = z.object({
    email: z.email("A Valid Email is Required"),
});
