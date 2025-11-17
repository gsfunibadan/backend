import { Router } from "express";
import { requireAuth } from "../middlewares/authenticate";
import { applyForAuthor } from "../controllers/author/applyForAuthor";

import { editAuthorProfile } from "../controllers/author/editAuthorProfile";
import { getAuthorAnalytics } from "../controllers/author/getAuthorAnalytics";
import { getAuthorRecentPosts } from "../controllers/author/getAuthorRecentPosts";
import { uploadImageMiddleware } from "../middlewares/uploadImage";

const router = Router();

router.use(requireAuth);
//todo: I might need to add a get profile endpoint for author

router.post("/apply", uploadImageMiddleware("profilePicture"), applyForAuthor);
router.patch("/profile", uploadImageMiddleware("profilePicture"), editAuthorProfile);
router.get("/analytics", getAuthorAnalytics);
router.get("/posts/recent", getAuthorRecentPosts);

export { router as authorRouter };
