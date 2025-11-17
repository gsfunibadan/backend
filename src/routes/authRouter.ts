import { Router } from "express";
import { signUp } from "../controllers/auth/signup";
import { signIn } from "../controllers/auth/signin";
import { forgetPassword } from "../controllers/auth/forgotPassword";
import { resetPassword } from "../controllers/auth/resetPassword";
import { verifyEmail } from "../controllers/auth/verifyEmail";
import { resendVerificationToken } from "../controllers/auth/resendVerificationToken";
import { requireAuth } from "../middlewares/authenticate";
import { refreshToken } from "../controllers/auth/refreshTokens";
import { signOut } from "../controllers/auth/signout";

const router = Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/password/forgot", forgetPassword);
router.post("/password/reset", resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationToken);
router.post("/refresh-token", refreshToken);

router.delete("/signout", requireAuth, signOut);

//Implement the signout here dawg
export { router as authRouter };
