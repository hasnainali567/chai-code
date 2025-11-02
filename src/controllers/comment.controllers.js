import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import Video from "../models/video.model.js";
import ApiResponse from "../utils/apiResponse.js";

const getAllComments = asyncHandler(async (req, res, next) => {

    const { videoId } = req.params || req.body

    if (!videoId) {
        throw new ApiError(400, 'video id is required');
    }

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'createdBy',
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            'avatar.url': 1,
                            _id: 0
                        }
                    },
                ]
            }
        },
        {
            $unwind: '$createdBy'
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                createdBy: 1
            }
        }
    ])


    if (!comments) {
        throw new ApiError(404, 'No comments found for this video');
    }

    res.status(200).json(new ApiResponse(200, 'Comments fetched successfully', { comments }));


});


const createComment = asyncHandler(async (req, res, next) => {

    if (!req?.params?.videoId) {
        throw new ApiError(400, 'videoId is required');
    }

    if (!req?.body?.content) {
        throw new ApiError(400, 'content is required');
    }

    const { videoId } = req.params || req.body;
    const { content } = req.body;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    const comment = await Comment.create({
        video: video._id,
        content: content.trim(),
        createdBy: req.user._id
    });

    res.status(201).json(new ApiResponse(201, 'Comment created successfully', { comment: { content: comment.content, _id: comment._id, createdAt: comment.createdAt } }));
});

const deleteComment = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!req?.params?.commentId) {
        throw new ApiError(400, 'commentId is required');
    }

    const { commentId } = req.params;


    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, 'Comment not found');
    }

    if (comment.createdBy.toString() !== user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to delete comments on this video');
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json(new ApiResponse(200, 'Comment deleted successfully'));
});

export {
    getAllComments,
    createComment,
    deleteComment
}