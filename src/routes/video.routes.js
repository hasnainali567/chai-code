import { Router } from "express";
import { deleteVideoById, getAllVideos, getVideoById, updateVideoDetailsById, updateVideoThumbnailById, uploadVideo } from "../controllers/video.controllers.js";
import { verifyUser } from '../middleware/user.middleware.js'
import uploadMiddleware from "../middleware/upload.middleware.js";
import { verifyUserOptional } from "../middleware/optionalAuth.middleware.js";

const router = Router();

router.route('/upload-video').post(verifyUser, uploadMiddleware(['videoFile', 'thumbnail']), uploadVideo);
router.route('/get-all-videos').get(getAllVideos);
router.route('/get-video/:videoId').get(verifyUserOptional, getVideoById);
router.route('/delete-video/:videoId').delete(verifyUser, deleteVideoById);
router.route('/update-video/:videoId').put(verifyUser, updateVideoDetailsById);
router.route('/update-video-thumbnail/:videoId').put(verifyUser, updateVideoThumbnailById);

export default router;