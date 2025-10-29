import multer from "multer";
import ApiError from "../utils/apiError.js";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/temp/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now().toString().slice(-6,) + '-' + req.user?.username + '-' + file.originalname);
    }
});
const upload = multer({
    storage, limits: { fileSize: 30 * 1024 * 1024 }, 
    fileFilter: function (req, file, cb) {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'video/mov', 'video/avi', 'video/mkv'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG images and MP4, MOV, AVI, MKV videos are allowed.'));
        }
        cb(null, true);
    }
});

export { upload };