import { Router } from "express";
import { loginUser, logoutUser, refreshToken, registerUser } from "../controllers/user.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
import app from "../app.js";
import ApiError from "../utils/apiError.js";
import { verifyUser } from "../middleware/user.middleware.js";

const router = Router();

const uploadMiddleware = (req, res, next) => {
    upload.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 }
    ])(req, res, function (err) {
        if (err) {
            return new ApiError(400, 'File Upload Error', [err.message]);
        }
        next();
    });

}

router.get('/', (req, res) => {
    res.send('User route is working');
});

router.route('/register').post(uploadMiddleware,
    registerUser);

router.route('/login').post(
    loginUser
);

router.route('/logout').post(verifyUser, logoutUser);
router.route('/refresh-token').post(refreshToken);

export default router;