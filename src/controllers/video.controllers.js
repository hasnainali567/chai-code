import Video from "../models/video.model.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadToCloudinary, uploadVideoToCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

const uploadVideo = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const { title, description } = req.body;

    if (!(title && description)) {
        throw new ApiError(400, 'Title and description are required');
    }
    if (!req.files || !req.files['videoFile'] || req.files['videoFile'].length === 0) {
        if (req.files['thumbnail']) {
            const thumbnailLocalPath = req.files['thumbnail'][0].path;
            fs.unlinkSync(thumbnailLocalPath);
        }
        throw new ApiError(400, 'No video file uploaded');
    }

    if (!req.files || !req.files['thumbnail'] || req.files['thumbnail'].length === 0) {
        if (req.files['videoFile']) {
            const videoLocalPath = req.files['videoFile'][0].path;
            console.log(videoLocalPath);

            fs.unlinkSync(videoLocalPath);
        }
        throw new ApiError(400, 'No thumbnail file uploaded');
    }
    const videoLocalPath = req.files['videoFile'][0].path;
    const thumbnailLocalPath = req.files['thumbnail'][0].path;

    let videoUploadResult;
    let thumbnailUploadResult;

    try {
        thumbnailUploadResult = await uploadToCloudinary(thumbnailLocalPath, 'thumbnails');
        videoUploadResult = await uploadVideoToCloudinary(videoLocalPath);
        const newVideo = new Video({
            video: {
                url: videoUploadResult.secure_url,
                public_id: videoUploadResult.public_id,
            },
            thumbnail : thumbnailUploadResult,
            title,
            description,
            duration: videoUploadResult.duration || 0,
            owner: user._id,
        });
        await newVideo.save();
        res.status(201).json(new ApiResponse(201, 'Video uploaded successfully', { video: newVideo }));
    } catch (error) {
        if (thumbnailUploadResult && thumbnailUploadResult.public_id) {
            await deleteFromCloudinary(thumbnailUploadResult.public_id);
        }
        if (videoUploadResult && videoUploadResult.public_id) {
            await deleteFromCloudinary(videoUploadResult.public_id);
        }
        throw new ApiError(500, 'Video Upload Error', error.message);
    }
});

export {
    uploadVideo,
};