import { Router } from "express";
import { getCurrentUserProfile, getWatchHistory, loginUser, logoutUser, refreshToken, registerUser, resetCurrentUserPassword, updateCurrentUserAvatar, updateCurrentUserCoverImage } from "../controllers/user.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
import app from "../app.js";
import ApiError from "../utils/apiError.js";
import { verifyUser } from "../middleware/user.middleware.js";
import { uploadVideo } from "../controllers/video.controllers.js";
import { uploadMiddleware } from "../middleware/upload.middleware.js";

const router = Router();


router.get('/', (req, res) => {
    res.send('User route is working');
});

router.route('/register').post(uploadMiddleware(['avatar', 'coverImage']),
    registerUser);

router.route('/login').post(
    loginUser
);

router.route('/logout').post(verifyUser, logoutUser);
router.route('/refresh-token').post(refreshToken);
router.route('/reset-password').post(verifyUser, resetCurrentUserPassword);
router.route('/me').get(verifyUser, getCurrentUserProfile);
router.route('/update-avatar').put(verifyUser, upload.single('avatar'), updateCurrentUserAvatar);
router.route('/update-cover').put(verifyUser, upload.single('coverImage'), updateCurrentUserCoverImage);
router.route('/watch-history').get(verifyUser, getWatchHistory);
router.route('/upload-video').post(verifyUser, uploadMiddleware(['videoFile', 'thumbnail']), uploadVideo);

export default router;