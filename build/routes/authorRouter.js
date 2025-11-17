"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../middlewares/authenticate");
const applyForAuthor_1 = require("../controllers/author/applyForAuthor");
const editAuthorProfile_1 = require("../controllers/author/editAuthorProfile");
const getAuthorAnalytics_1 = require("../controllers/author/getAuthorAnalytics");
const getAuthorRecentPosts_1 = require("../controllers/author/getAuthorRecentPosts");
const uploadImage_1 = require("../middlewares/uploadImage");
const router = (0, express_1.Router)();
exports.authorRouter = router;
router.use(authenticate_1.requireAuth);
//todo: I might need to add a get profile endpoint for author
router.post(
    "/apply",
    (0, uploadImage_1.uploadImageMiddleware)("profilePicture"),
    applyForAuthor_1.applyForAuthor
);
router.patch(
    "/profile",
    (0, uploadImage_1.uploadImageMiddleware)("profilePicture"),
    editAuthorProfile_1.editAuthorProfile
);
router.get("/analytics", getAuthorAnalytics_1.getAuthorAnalytics);
router.get("/posts/recent", getAuthorRecentPosts_1.getAuthorRecentPosts);
