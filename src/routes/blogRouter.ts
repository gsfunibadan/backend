import { Router } from "express";
import { requireAuth } from "../middlewares/authenticate";

import { getBlogs } from "../controllers/blog/getBlogs";
import { getBlogStats } from "../controllers/blog/getBlogStats";
import { createBlog } from "../controllers/blog/createNewBlog";
import { updateBlog } from "../controllers/blog/updateBlog";

import { handleLikeInteraction } from "../controllers/blog/handleLikeInteraction";
import { addComment } from "../controllers/blog/addComment";
import { deleteComment } from "../controllers/blog/deleteComment";
import { getBlogComments } from "../controllers/blog/getBlogComments";
import { handleCommentLike } from "../controllers/blog/handleCommentLike";
import { updateGenericViewCount } from "../controllers/blog/updateGenericViews";
import { updateVerifiedViewCount } from "../controllers/blog/updateVerifiedViews";

const router = Router();

// ===== PUBLIC ROUTES =====
// Browse all blogs
router.get("/", getBlogs);

router.get("/:blogId/stats", getBlogStats);

// Comments
router.get("/:blogId/comments", getBlogComments);

router.post("/:blogId/views", updateGenericViewCount);

router.use(requireAuth);
router.post("/", createBlog);
router.put("/:blogId", updateBlog);
router.post("/:blogId/reads", updateVerifiedViewCount);
router.post("/:blogId/likes", handleLikeInteraction);
router.post("/:blogId/comments", addComment);
router.delete("/:blogId/comments/:commentId", deleteComment);
router.post("/:blogId/comments/:commentId/likes", handleCommentLike);

export { router as blogRouter };
