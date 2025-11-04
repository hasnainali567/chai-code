import { error } from "console";
import Video from "../models/video.model.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadToCloudinary, uploadVideoToCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import mongoose from "mongoose";



const uploadVideo = asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!(req?.body?.title && req?.body?.description)) {
        return next(new ApiError(400, 'Title and description are required'));
    }
    const { title, description } = req.body;

    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    // --- Validate file presence ---
    if (!videoLocalPath) {
        if (thumbnailLocalPath) {
            await fs.promises.unlink(thumbnailLocalPath); // async safe deletion
        }
        throw new ApiError(400, 'No video file uploaded');
    }

    if (!thumbnailLocalPath) {
        await fs.promises.unlink(videoLocalPath);
        throw new ApiError(400, 'No thumbnail file uploaded');
    }

    let videoUploadResult;
    let thumbnailUploadResult;

    try {
        thumbnailUploadResult = await uploadToCloudinary(thumbnailLocalPath, 'thumbnails');
        videoUploadResult = await uploadVideoToCloudinary(videoLocalPath);
        const video = new Video({
            video: {
                url: videoUploadResult.secure_url,
                public_id: videoUploadResult.public_id,
            },
            thumbnail: thumbnailUploadResult,
            title,
            description,
            duration: videoUploadResult.duration || 0,
            owner: user._id,
        });
        await video.save();
        const newVideo = await Video.findById(video._id).select('-__v -thumbnail.public_id -video.public_id -owner');
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

const getAllVideos = asyncHandler(async (req, res, next) => {
    const {page, limit} = req.query;
    const options =  {
        page : Number(page),
        limit: Number(limit) || 10,
    }
    const aggregate = Video.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner',
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            'avatar.url': 1,
                            _id: 0
                        }
                    }
                ]
            }
        }, {
            $unwind: {
                path: '$owner',
            }
        },
        {
            $project: {
                __v: 0,
                video: 0,
                updatedAt: 0,
                'thumbnail.public_id': 0,
            }
        }
    ]);

    const videos = await Video.aggregatePaginate(aggregate, options)
    const {docs, ...pagination} = videos;
    
    res.status(200).json(new ApiResponse(200, 'Videos fetched successfully', { videos : docs, pagination }));
});

const getVideoById = asyncHandler(async (req, res, next) => {
    const { videoId } = req.params;
    const userId = req.user ? req.user._id : null;

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId("69034af5b00fad333e8dee6b")
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: userId ? {
                                $in: [
                                    new mongoose.Types.ObjectId(
                                        userId
                                    ),
                                    {
                                        $map: {
                                            input: "$subscribers",
                                            as: "s",
                                            in: "$$s.subscriber"
                                        }
                                    }
                                ]
                            } : false
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes"
                },
                isLiked: userId ? {
                    $in: [
                        new mongoose.Types.ObjectId("6901dcb2c69c13e4c67da40c"),
                        {
                            $map: {
                                input: "$likes",
                                as: "like",
                                in: "$$like.likedBy"
                            }
                        }
                    ]
                } : false
            }
        },
        {
            $unwind: {
                path: "$owner",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                __v: 0,
                "thumbnail.public_id": 0,
                "video.public_id": 0,
                "owner._id": 0,
                updatedAt: 0
            }
        }
    ]);

    if (!video.length) {
        throw new ApiError(404, "Video not found");
    }

    res
        .status(200)
        .json(new ApiResponse(200, "Video fetched successfully", { video: video[0] }));
});


const updateVideoDetailsById = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const videoId = req.params.videoId;
    const { title, description } = req.body;
    if (!title?.trim() && !description?.trim()) {
        throw new ApiError(400, 'At least one field (title or description) is required to update');
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    if (video.owner.toString() !== user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to update this video');
    }

    video.title = title || video.title;
    video.description = description || video.description;
    await video.save();
    res.status(200).json(new ApiResponse(200, 'Video details updated successfully', { video }));
});


const updateVideoThumbnailById = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const videoId = req.params.videoId;
    if (!req.file) {
        throw new ApiError(400, 'No thumbnail file uploaded');
    }
    const video = await Video.findById(videoId);
    if (!video) {
        const thumbnailLocalPath = req.file.path;
        fs.unlinkSync(thumbnailLocalPath);
        throw new ApiError(404, 'Video not found');
    }

    if (video.owner.toString() !== user._id.toString()) {
        const thumbnailLocalPath = req.file.path;
        fs.unlinkSync(thumbnailLocalPath);
        throw new ApiError(403, 'You are not authorized to update this video');
    }
    const thumbnailLocalPath = req.file.path;
    let thumbnailUploadResult;

    try {
        thumbnailUploadResult = await uploadToCloudinary(thumbnailLocalPath, 'thumbnails');
        const oldThumbnailPublicId = video.thumbnail.public_id;
        video.thumbnail = thumbnailUploadResult;
        const updatedVideo = await video.save();
        res.status(200).json(new ApiResponse(200, 'Video thumbnail updated successfully', { video }));
        await deleteFromCloudinary(oldThumbnailPublicId);
    } catch (error) {
        if (thumbnailUploadResult && thumbnailUploadResult.public_id) {
            await deleteFromCloudinary(thumbnailUploadResult.public_id);
        }
        res.status(500).json(new ApiError(500, 'Error updating thumbnail', error.message));
    }
});

const deleteVideoById = asyncHandler(async (req, res, next) => {
    const videoId = req.params.videoId;
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, 'Video not found');
    }
    try {
        await deleteFromCloudinary(video.video.public_id);
        await deleteFromCloudinary(video.thumbnail.public_id);
        await video.remove();
    } catch (error) {
        throw new ApiError(500, 'Error deleting video', error.message);
    }
    res.status(200).json(new ApiResponse(200, 'Video deleted successfully'));
});



export {
    uploadVideo,
    getAllVideos,
    getVideoById,
    deleteVideoById,
    updateVideoDetailsById,
    updateVideoThumbnailById
};

