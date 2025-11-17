import { Router } from "express";

import { acceptAdminInvite } from "../controllers/admin/acceptAdminInvite";
import { approveAuthor } from "../controllers/admin/approveAuthor";
import { approveBlog } from "../controllers/admin/approveBlog";
import { getAdminInvites } from "../controllers/admin/getAdminInvites";
import { getAuthor } from "../controllers/admin/getAuthor";
import { getAuthors } from "../controllers/admin/getAuthors";
import { getDashboardStats } from "../controllers/admin/getDashboardStats";
import { getPendingBlogs } from "../controllers/admin/getPendingBlogs";
import { getUser } from "../controllers/admin/getUser";
import { getUsers } from "../controllers/admin/getUsers";
import { inviteAdmin } from "../controllers/admin/inviteAdmin";
import { rejectAuthor } from "../controllers/admin/rejectAuthor";
import { removeAdmin } from "../controllers/admin/removeAdmin";
import { resendAdminInvite } from "../controllers/admin/resendAdminInvite";
import { suspendAuthor } from "../controllers/admin/suspendAuthor";
import { unapproveBlog } from "../controllers/admin/unapproveBlog";
import { unsuspendAuthor } from "../controllers/admin/unSuspendAuthor";
import { requireAuth } from "../middlewares/authenticate";

const router = Router();

router.use(requireAuth);

router.get("/admin-invitations", getAdminInvites);
router.post("/admin-invitations", inviteAdmin);
router.post("/admin-invitations/accept", acceptAdminInvite);
router.post("/admin-invitations/resend", resendAdminInvite);

//This remove admin would be  kinda tricky ngl, so I'ma just avoid it and let the suspending be done by the person in charge of the app....
router.post("/admins/", removeAdmin);

router.get("/authors", getAuthors);
router.get("/authors/:authorId", getAuthor);
router.post("/authors/:authorId/approve", approveAuthor);
router.post("/authors/:authorId/reject", rejectAuthor);
router.post("/authors/:authorId/suspend", suspendAuthor);
router.post("/authors/:authorId/unsuspend", unsuspendAuthor);

router.get("/blogs/pending", getPendingBlogs);
router.post("/blogs/:blogId/approve", approveBlog);
router.post("/blogs/:blogId/unapprove", unapproveBlog);

router.get("/users", getUsers);
router.get("/users/:userId", getUser);

router.get("/dashboard/stats", getDashboardStats);

export { router as adminRouter };
