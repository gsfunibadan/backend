import { z } from "zod";

export const getPublicUserProfileSchema = z.object({
    userName: z.string().min(1, "Username is required").max(50, "Username is too long"),
});
