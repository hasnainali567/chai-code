import { Router } from "express";
import { createComment, deleteComment, getAllComments } from "../controllers/comment.controllers.js";
import { verifyUser } from "../middleware/user.middleware.js";

const router = Router();

router.route('/:commentId')
    .delete(verifyUser, deleteComment);

router.route('/:videoId')
    .get(getAllComments)
    .post(verifyUser, createComment);


export default router;