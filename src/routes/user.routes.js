import { Router } from "express";
import {
    getCurrentUserProfile,
    getUserChannelProfile,
    getWatchHistory,
    loginUser, logoutUser,
    refreshToken,
    registerUser,
    resetCurrentUserPassword,
    updateCurrentUserAvatar,
    updateCurrentUserCoverImage,
    updateCurrentUserProfile
} from "../controllers/user.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyUser } from "../middleware/user.middleware.js";
import { uploadVideo } from "../controllers/video.controllers.js";
import { uploadMiddleware } from "../middleware/upload.middleware.js";

const router = Router();



router.route('/register').post(uploadMiddleware(['avatar', 'coverImage']),registerUser);
router.route('/login').post(loginUser);
router.route('/logout').post(verifyUser, logoutUser);
router.route('/refresh-token').post(refreshToken);
router.route('/reset-password').post(verifyUser, resetCurrentUserPassword);
router.route('/me').get(verifyUser, getCurrentUserProfile);
router.route('/update-profile').patch(verifyUser, updateCurrentUserProfile);
router.route('/update-avatar').put(verifyUser, upload.single('avatar'), updateCurrentUserAvatar);
router.route('/update-cover').put(verifyUser, upload.single('coverImage'), updateCurrentUserCoverImage);
router.route('/channel/:username').get(getUserChannelProfile);
router.route('/history').get(verifyUser, getWatchHistory);
export default router;