import { Router } from "express";
import { verifyUser } from "../middleware/user.middleware.js";
import { getAllLikedVideos, toggleLikeOnComment, toggleLikeOnTweet, toggleLikeOnVideo } from "../controllers/like.controllers.js";

const router = Router();

router.route('/like-toggle/:videoId').post(verifyUser, toggleLikeOnVideo);
router.route('/like-toggle-comment/:commentId').post(verifyUser, toggleLikeOnComment);
router.route('/like-toggle-tweet/:tweetId').post(verifyUser, toggleLikeOnTweet);
router.route('/get-all-liked').get(verifyUser, getAllLikedVideos);

export default router;