import ApiError from "../utils/apiError.js";
import { upload } from "./multer.middleware.js";

export const uploadMiddleware = (fieldNames = []) => (req, res, next) => {
    const fields = fieldNames.map(name => ({ name, maxCount: 1 }));

    upload.fields(fields)(req, res, (err) => {
        if (err) {
            return next(new ApiError(400, 'File Upload Error', [err.message]));
        }
        next();
    });
};

export default uploadMiddleware;