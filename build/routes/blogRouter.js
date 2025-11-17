"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../middlewares/authenticate");
const getBlogs_1 = require("../controllers/blog/getBlogs");
const getBlogStats_1 = require("../controllers/blog/getBlogStats");
const createNewBlog_1 = require("../controllers/blog/createNewBlog");
const updateBlog_1 = require("../controllers/blog/updateBlog");
const handleLikeInteraction_1 = require("../controllers/blog/handleLikeInteraction");
const addComment_1 = require("../controllers/blog/addComment");
const deleteComment_1 = require("../controllers/blog/deleteComment");
const getBlogComments_1 = require("../controllers/blog/getBlogComments");
const handleCommentLike_1 = require("../controllers/blog/handleCommentLike");
const updateGenericViews_1 = require("../controllers/blog/updateGenericViews");
const updateVerifiedViews_1 = require("../controllers/blog/updateVerifiedViews");
const router = (0, express_1.Router)();
exports.blogRouter = router;
// ===== PUBLIC ROUTES =====
// Browse all blogs
router.get("/", getBlogs_1.getBlogs);
router.get("/:blogId/stats", getBlogStats_1.getBlogStats);
// Comments
router.get("/:blogId/comments", getBlogComments_1.getBlogComments);
router.post("/:blogId/views", updateGenericViews_1.updateGenericViewCount);
router.use(authenticate_1.requireAuth);
router.post("/", createNewBlog_1.createBlog);
router.put("/:blogId", updateBlog_1.updateBlog);
router.post("/:blogId/reads", updateVerifiedViews_1.updateVerifiedViewCount);
router.post("/:blogId/likes", handleLikeInteraction_1.handleLikeInteraction);
router.post("/:blogId/comments", addComment_1.addComment);
router.delete("/:blogId/comments/:commentId", deleteComment_1.deleteComment);
router.post("/:blogId/comments/:commentId/likes", handleCommentLike_1.handleCommentLike);
