import { Router } from "express";
import { verifyUser } from "../middleware/user.middleware.js";
import { getAllLikedVideos, toggleLikeOnComment, toggleLikeOnTweet, toggleLikeOnVideo } from "../controllers/like.controllers.js";

const router = Router();

router.use(verifyUser);

router.route('/like-toggle/:videoId').post(toggleLikeOnVideo);
router.route('/like-toggle-comment/:commentId').post(toggleLikeOnComment);
router.route('/like-toggle-tweet/:tweetId').post(toggleLikeOnTweet);
router.route('/get-all-liked').get(getAllLikedVideos);

export default router;