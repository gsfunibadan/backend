import { Router } from "express";
import { editUserProfile } from "../controllers/user/editProfile";
import { requireAuth } from "../middlewares/authenticate";
import { getPublicUserProfile } from "../controllers/user/getPublicUserProfile";
import { getUserProfile } from "../controllers/user/getProfile";

const router = Router();

router.use("/my-details", requireAuth);
router.get("/my-details", getUserProfile);
router.patch("/my-details", editUserProfile);

router.get("/:userName", getPublicUserProfile);

export { router as userRouter };
